import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createVisionMessage, extractJSON } from '@/lib/anthropic';
import { success, error, ErrorCodes } from '@/types/api';
import {
  ViewType,
  PhotoValidation,
  ValidationErrorCodes,
  RejectionMessages
} from '@/lib/scoring';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const maxDuration = 30; // Validation should be quick

// Request schema
const validatePhotoRequestSchema = z.object({
  photoBase64: z.string().min(100),
  expectedView: z.enum([
    'face_front',
    'face_side',
    'body_front',
    'body_side',
    'body_back',
  ]),
});

// Response from AI validation
interface AIValidationResponse {
  subjectDetected: boolean;
  subjectType: 'face' | 'body' | 'none';
  faceVisible: boolean;
  fullBodyVisible: boolean;
  
  pose: {
    yaw: number;
    pitch: number;
    roll: number;
    confidence: number;
  };
  
  quality: {
    blur: number;       // 0-1, lower = more blur
    resolution: number; // estimated subject resolution
    brightness: number; // 0-1
    filterSuspected: number; // 0-1
  };
  
  occlusion: {
    score: number; // 0-1, 0 = no occlusion
    areas: string[];
  };
  
  viewClassification: {
    detected: 'face_front' | 'face_side' | 'body_front' | 'body_side' | 'body_back' | 'unknown' | 'rejected';
    confidence: number;
    reason?: string;
  };
}

const VALIDATION_PROMPT = `Analyze this photo for validation. Return ONLY valid JSON:

{
  "subjectDetected": boolean,
  "subjectType": "face" | "body" | "none",
  "faceVisible": boolean,
  "fullBodyVisible": boolean,
  "pose": {
    "yaw": number (-180 to 180, 0 = front facing),
    "pitch": number (-90 to 90, 0 = level),
    "roll": number (-180 to 180, 0 = upright),
    "confidence": 0-1
  },
  "quality": {
    "blur": 0-1 (0 = very blurry, 1 = sharp),
    "resolution": number (estimated pixels of subject area),
    "brightness": 0-1 (0.5 = ideal),
    "filterSuspected": 0-1 (0 = natural, 1 = heavy filter)
  },
  "occlusion": {
    "score": 0-1 (0 = nothing blocked, 1 = fully blocked),
    "areas": ["list", "of", "blocked", "areas"]
  },
  "viewClassification": {
    "detected": "face_front" | "face_side" | "body_front" | "body_side" | "body_back" | "unknown" | "rejected",
    "confidence": 0-1,
    "reason": "optional reason if rejected/unknown"
  }
}

Classification rules:
- face_front: Face directly facing camera, yaw within ±12°, both eyes visible
- face_side: True profile, yaw 75-105°
- body_front: Full body head-to-feet, front facing
- body_side: Full body, 90° turn
- body_back: Full body, back facing (face not visible)
- rejected: 3/4 angle face, cropped body, or unusable

Return ONLY the JSON.`;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        error(ErrorCodes.RATE_LIMITED, 'Rate limit exceeded. Please wait and try again.'),
        { status: 429 }
      );
    }

    // Parse request
    const body = await request.json();
    const validation = validatePhotoRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        error(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request',
          { errors: validation.error.flatten().fieldErrors }
        ),
        { status: 400 }
      );
    }

    const { photoBase64, expectedView } = validation.data;

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'AI service not configured'),
        { status: 500 }
      );
    }

    // Call AI for validation
    let text;
    try {
      text = await createVisionMessage(
        VALIDATION_PROMPT,
        [{ base64: photoBase64, mediaType: 'image/jpeg' }]
      );
    } catch (apiError) {
      console.error('Validation API error:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown';

      if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
        return NextResponse.json(
          error(ErrorCodes.RATE_LIMITED, 'Please wait and try again'),
          { status: 429 }
        );
      }

      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'Validation service unavailable'),
        { status: 500 }
      );
    }

    let aiResult: AIValidationResponse;
    try {
      aiResult = extractJSON<AIValidationResponse>(text);
    } catch {
      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'Failed to parse validation response'),
        { status: 500 }
      );
    }

    // Build validation result
    const validationResult = buildValidationResult(aiResult, expectedView);

    if (!validationResult.isValid) {
      return NextResponse.json(
        error(
          validationResult.rejectionReason?.includes('quality') 
            ? ValidationErrorCodes.LOW_QUALITY 
            : ValidationErrorCodes.INVALID_VIEW,
          validationResult.rejectionReason || 'Photo validation failed',
          {
            detectedView: validationResult.detectedView,
            issues: validationResult.issues,
            warnings: validationResult.warnings,
          }
        ),
        { status: 400 }
      );
    }

    return NextResponse.json(success({
      valid: true,
      detectedView: validationResult.detectedView,
      qualityScore: validationResult.qualityScore,
      warnings: validationResult.warnings,
    }));

  } catch (err) {
    console.error('Validation error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Validation failed'),
      { status: 500 }
    );
  }
}

function buildValidationResult(
  aiResult: AIValidationResponse,
  expectedView: ViewType
): PhotoValidation {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check subject detection
  if (!aiResult.subjectDetected) {
    return {
      isValid: false,
      detectedView: 'rejected',
      pose: aiResult.pose,
      qualityScore: 0,
      issues: ['No subject detected in photo'],
      warnings: [],
      rejectionReason: 'Could not detect a person in this photo. Please upload a clear photo.',
    };
  }

  // Check quality
  const quality = aiResult.quality;
  let qualityScore = 1.0;

  if (quality.blur < 0.3) {
    issues.push(RejectionMessages.too_blurry);
    qualityScore *= 0.3;
  } else if (quality.blur < 0.5) {
    warnings.push('Image slightly blurry');
    qualityScore *= 0.7;
  }

  if (quality.resolution < 256) {
    issues.push(RejectionMessages.resolution_low);
    qualityScore *= 0.4;
  }

  if (quality.filterSuspected > 0.7) {
    issues.push(RejectionMessages.filter_suspected);
    qualityScore *= 0.5;
  } else if (quality.filterSuspected > 0.4) {
    warnings.push('Possible filter detected - results may be less accurate');
    qualityScore *= 0.8;
  }

  if (quality.brightness < 0.25 || quality.brightness > 0.85) {
    warnings.push('Lighting could be better');
    qualityScore *= 0.8;
  }

  // Check occlusion
  if (aiResult.occlusion.score > 0.3) {
    const occludedAreas = aiResult.occlusion.areas.join(', ');
    issues.push(`Key features are obscured: ${occludedAreas}`);
    qualityScore *= 0.5;
  }

  // Check view classification
  const detected = aiResult.viewClassification.detected;
  
  if (detected === 'rejected' || detected === 'unknown') {
    return {
      isValid: false,
      detectedView: detected,
      pose: aiResult.pose,
      qualityScore,
      issues,
      warnings,
      rejectionReason: aiResult.viewClassification.reason || getDefaultRejectionMessage(expectedView),
    };
  }

  // Check if detected view matches expected
  if (detected !== expectedView) {
    return {
      isValid: false,
      detectedView: detected,
      pose: aiResult.pose,
      qualityScore,
      issues,
      warnings,
      rejectionReason: getViewMismatchMessage(expectedView, detected),
    };
  }

  // Check subject visibility for view type
  if (expectedView.startsWith('face_') && !aiResult.faceVisible) {
    return {
      isValid: false,
      detectedView: 'rejected',
      pose: aiResult.pose,
      qualityScore,
      issues: [...issues, 'Face not clearly visible'],
      warnings,
      rejectionReason: RejectionMessages.face_occluded,
    };
  }

  if (expectedView.startsWith('body_') && !aiResult.fullBodyVisible) {
    return {
      isValid: false,
      detectedView: 'rejected',
      pose: aiResult.pose,
      qualityScore,
      issues: [...issues, 'Full body not visible'],
      warnings,
      rejectionReason: RejectionMessages.body_not_full,
    };
  }

  // All checks passed
  const isValid = issues.length === 0 && qualityScore >= 0.5;

  return {
    isValid,
    detectedView: detected,
    pose: aiResult.pose,
    qualityScore: Math.max(0, Math.min(1, qualityScore)),
    issues,
    warnings,
    rejectionReason: isValid ? undefined : 'Photo quality too low for accurate analysis',
  };
}

function getDefaultRejectionMessage(expectedView: ViewType): string {
  switch (expectedView) {
    case 'face_front':
      return RejectionMessages.face_not_front;
    case 'face_side':
      return RejectionMessages.face_not_side;
    case 'body_front':
      return RejectionMessages.body_not_front;
    case 'body_side':
      return RejectionMessages.body_not_side;
    case 'body_back':
      return RejectionMessages.body_not_back;
    default:
      return 'Photo does not match expected view type';
  }
}

function getViewMismatchMessage(expected: ViewType, got: ViewType | 'unknown'): string {
  const expected_label = expected.replace('_', ' ');
  const got_label = (got as string).replace('_', ' ');
  
  return `Expected ${expected_label} view, but detected ${got_label}. Please upload the correct view.`;
}
