import { NextRequest, NextResponse } from 'next/server';
import { getVisionModel, base64ToGenerativePart, extractJSON } from '@/lib/gemini';
import { bodyScanRequestSchema, bodyAnalysisResultSchema } from '@/lib/validations/body';
import { success, error, ErrorCodes } from '@/types/api';
import type { BodyAnalysisResult } from '@/types/body';
import { buildBodyAnalysisPrompt } from '@/lib/prompts/body-analysis';
import {
  computeImageHash,
  getCachedResult,
  setCachedResult,
  CONFIDENCE_THRESHOLDS,
} from '@/lib/scoring';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const maxDuration = 60;

// Endpoint version - bump when output format changes
const ENDPOINT_VERSION = '2.0.0';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.reset);
      return NextResponse.json(
        error(
          ErrorCodes.RATE_LIMITED,
          `Rate limit exceeded. Please try again in ${Math.ceil((rateLimitResult.reset - Date.now()) / 1000)} seconds.`,
          {
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
            resetAt: resetDate.toISOString()
          }
        ),
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    const body = await request.json();
    const validation = bodyScanRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        error(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request data',
          { errors: validation.error.flatten().fieldErrors }
        ),
        { status: 400 }
      );
    }

    const { frontPhotoBase64, sidePhotoBase64, backPhotoBase64 } = validation.data;

    // Compute image hash for caching and determinism
    const imageHash = computeImageHash(frontPhotoBase64);

    // Check cache first
    const cachedResult = getCachedResult<BodyAnalysisResult>(imageHash, ENDPOINT_VERSION);
    if (cachedResult) {
      console.log('Returning cached result for hash:', imageHash.slice(0, 8));
      return NextResponse.json(success(cachedResult));
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        error(
          ErrorCodes.SERVER_ERROR,
          'AI service not configured. Please add GEMINI_API_KEY to environment variables.'
        ),
        { status: 500 }
      );
    }

    console.log('Starting body analysis...');
    console.log('Image hash:', imageHash.slice(0, 8));

    const hasSidePhoto = !!sidePhotoBase64;
    const hasBackPhoto = !!backPhotoBase64;
    const prompt = buildBodyAnalysisPrompt(hasSidePhoto, hasBackPhoto);

    const imageParts = [
      base64ToGenerativePart(frontPhotoBase64, 'image/jpeg'),
    ];

    if (sidePhotoBase64) {
      imageParts.push(base64ToGenerativePart(sidePhotoBase64, 'image/jpeg'));
    }

    if (backPhotoBase64) {
      imageParts.push(base64ToGenerativePart(backPhotoBase64, 'image/jpeg'));
    }

    console.log('Calling Gemini API (temperature=0)...');
    const model = getVisionModel();
    
    let result;
    try {
      result = await model.generateContent([prompt, ...imageParts]);
    } catch (apiError) {
      console.error('Gemini API call failed:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
        return NextResponse.json(
          error(
            ErrorCodes.SERVER_ERROR,
            'Invalid API key. Please check your GEMINI_API_KEY configuration.'
          ),
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate') || errorMessage.includes('429')) {
        return NextResponse.json(
          error(
            ErrorCodes.RATE_LIMITED,
            'API rate limit reached. Please wait a minute and try again.'
          ),
          { status: 429 }
        );
      }
      
      if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        return NextResponse.json(
          error(
            ErrorCodes.ANALYSIS_FAILED,
            'Image was blocked by safety filters. Please try a different photo.'
          ),
          { status: 400 }
        );
      }

      return NextResponse.json(
        error(
          ErrorCodes.SERVER_ERROR,
          `AI service error: ${errorMessage}`
        ),
        { status: 500 }
      );
    }
    
    const response = await result.response;
    const text = response.text();
    console.log('Received response from Gemini, length:', text.length);

    let analysisData: BodyAnalysisResult;
    try {
      const rawData = extractJSON<BodyAnalysisResult & { isMinor?: boolean }>(text);
      
      // Handle minor detection
      const isMinor = rawData.isMinor;
      if (isMinor) {
        if (rawData.composition) {
          rawData.composition.leannessPresentationScore = 5; // Neutral
        }
      }
      
      // Post-process for determinism
      analysisData = postProcessBodyResult(rawData, hasSidePhoto);
      
      // Validate with zod - fail if validation fails
      const validated = bodyAnalysisResultSchema.safeParse(analysisData);
      if (!validated.success) {
        console.error('Validation failed:', validated.error.flatten());
        console.error('Invalid analysis data:', JSON.stringify(analysisData, null, 2));
        return NextResponse.json(
          error(
            ErrorCodes.ANALYSIS_FAILED,
            'AI response validation failed. The analysis data structure is invalid.',
            { validationErrors: validated.error.flatten() }
          ),
          { status: 500 }
        );
      }
      analysisData = validated.data;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', text.substring(0, 500));
      return NextResponse.json(
        error(
          ErrorCodes.ANALYSIS_FAILED,
          'Failed to process AI response. Please try again.'
        ),
        { status: 500 }
      );
    }

    // Strict quality rejection
    if (analysisData.photoQuality.score < 0.3) {
      return NextResponse.json(
        error(
          ErrorCodes.PHOTO_QUALITY_TOO_LOW,
          'Photo quality is too low for accurate analysis. Please ensure full body is visible with good lighting.',
          { issues: analysisData.photoQuality.issues }
        ),
        { status: 400 }
      );
    }

    // Apply confidence gating for marginal quality
    if (analysisData.photoQuality.score < 0.6) {
      analysisData = applyConfidenceGating(analysisData);
    }

    // Cache the result
    setCachedResult(imageHash, ENDPOINT_VERSION, analysisData);

    console.log('Analysis complete!');
    return NextResponse.json(success(analysisData));

  } catch (err) {
    console.error('Body scan error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    return NextResponse.json(
      error(
        ErrorCodes.SERVER_ERROR,
        `An unexpected error occurred: ${errorMessage}`
      ),
      { status: 500 }
    );
  }
}

/**
 * Post-process body analysis for determinism and calibration
 */
function postProcessBodyResult(
  raw: BodyAnalysisResult & { isMinor?: boolean },
  hasSideView: boolean
): BodyAnalysisResult {
  const roundScore = (v: number) => Math.round(v * 10) / 10;
  const roundConfidence = (v: number) => Math.round(v * 100) / 100;
  const roundRatio = (v: number) => Math.round(v * 100) / 100;
  
  // Process proportions
  const proportions = { ...raw.proportions };
  for (const key of ['shoulderToWaist', 'waistToHip', 'shoulderToHip', 'legToTorso'] as const) {
    if (proportions[key]) {
      proportions[key] = {
        ...proportions[key],
        value: roundRatio(proportions[key].value),
        confidence: roundConfidence(proportions[key].confidence),
      };
    }
  }
  
  // Process posture if side view
  let postureSignals = raw.postureSignals;
  if (!hasSideView) {
    // Remove posture data if no side view
    postureSignals = undefined;
  }
  
  // Calculate calibrated overall score
  const overallConfidence = roundConfidence(raw.overall.confidence);
  let currentScore = roundScore(raw.overall.currentScore10);
  
  // Apply honest extremes rule
  if (overallConfidence < CONFIDENCE_THRESHOLDS.allowExtremes) {
    currentScore = Math.max(2, Math.min(8, currentScore));
  }
  
  // Calculate potential range (modifiable factors)
  const postureRoom = postureSignals ? calculatePostureRoom(postureSignals) : 0;
  const compositionRoom = Math.max(0, (10 - (raw.composition?.leannessPresentationScore ?? 5)) * 0.15);
  let maxPotential = Math.min(
    currentScore + postureRoom + compositionRoom + 0.3,
    currentScore + 2.0,
    9.5
  );
  
  if (overallConfidence < 0.6) {
    maxPotential = Math.min(maxPotential + 0.3, 9.5);
  }
  
  return {
    ...raw,
    proportions,
    postureSignals,
    muscleBalance: raw.muscleBalance,
    composition: {
      ...raw.composition,
      leannessPresentationScore: roundScore(raw.composition.leannessPresentationScore),
      confidence: roundConfidence(raw.composition.confidence),
    },
    overall: {
      currentScore10: currentScore,
      potentialRange: {
        min: roundScore(Math.max(currentScore, raw.overall.potentialRange?.min ?? currentScore)),
        max: roundScore(maxPotential),
      },
      confidence: overallConfidence,
      summary: raw.overall.summary,
    },
    topLevers: (() => {
      if (!raw.topLevers || raw.topLevers.length < 3) {
        throw new Error(
          `AI response validation failed: Expected at least 3 top levers, got ${raw.topLevers?.length ?? 0}`
        );
      }
      return raw.topLevers.slice(0, 3) as [typeof raw.topLevers[0], typeof raw.topLevers[0], typeof raw.topLevers[0]];
    })(),
  };
}

/**
 * Calculate potential improvement from posture correction
 */
function calculatePostureRoom(posture: NonNullable<BodyAnalysisResult['postureSignals']>): number {
  let room = 0;
  
  const severityRoom: Record<string, number> = {
    none: 0,
    mild: 0.1,
    moderate: 0.2,
    significant: 0.3,
  };
  
  if (posture.forwardHead) {
    room += severityRoom[posture.forwardHead.severity] || 0;
  }
  if (posture.roundedShoulders) {
    room += severityRoom[posture.roundedShoulders.severity] || 0;
  }
  if (posture.pelvicTilt) {
    room += severityRoom[posture.pelvicTilt.severity] || 0;
  }
  
  return Math.min(room, 0.8); // Cap posture improvement potential
}

/**
 * Apply confidence gating for marginal quality photos
 */
function applyConfidenceGating(data: BodyAnalysisResult): BodyAnalysisResult {
  const gatedConfidence = Math.min(data.overall.confidence, 0.6);
  const currentScore = data.overall.currentScore10;
  
  return {
    ...data,
    composition: {
      ...data.composition,
      confidence: Math.min(data.composition.confidence, 0.4),
    },
    overall: {
      ...data.overall,
      confidence: gatedConfidence,
      potentialRange: {
        min: Math.round(Math.max(currentScore - 0.5, 1) * 10) / 10,
        max: Math.round(Math.min(currentScore + 2, 10) * 10) / 10,
      },
    },
  };
}
