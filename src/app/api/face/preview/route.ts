import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { success, error, ErrorCodes } from '@/types/api';
import { computeImageHash, getSeedFromHash, getCachedResult, setCachedResult } from '@/lib/scoring';
import { getFaceStyleRecommendations } from '@/lib/style-library';
import {
  estimateFaceReachability,
  getChangeBudget,
  describeAppliedChanges,
  type FacePreviewOptions
} from '@/lib/reachability';
import { enhanceFaceImage } from '@/lib/replicate';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const maxDuration = 60; // Increased for complex enhancements

const ENDPOINT_VERSION = '3.0.0'; // Bumped for Replicate integration

// Request schema
const requestSchema = z.object({
  frontPhotoBase64: z.string().min(100),
  sidePhotoBase64: z.string().min(100).optional().nullable(),
  faceShape: z.enum(['oval', 'round', 'square', 'heart', 'diamond', 'oblong']).optional().nullable(),
  faceShapeConfidence: z.number().min(0).max(1).optional().nullable(),
  photoQuality: z.number().min(0).max(1).optional().nullable(),
  currentHairLength: z.enum(['short', 'medium', 'long']).optional().nullable(),
  isMinor: z.boolean().optional().nullable(),
  options: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    hairstyle: z.object({
      length: z.enum(['short', 'medium', 'long']),
      finish: z.enum(['textured', 'clean']),
    }).optional(),
    glasses: z.object({
      enabled: z.boolean(),
      style: z.enum(['round', 'rectangular', 'browline', 'aviator', 'geometric']).optional().nullable(),
    }).optional(),
    grooming: z.object({
      facialHair: z.enum(['none', 'stubble', 'trimmed']).optional().nullable(),
      brows: z.enum(['natural', 'cleaned']).optional().nullable(),
    }).optional().nullable(),
    lighting: z.enum(['neutral_soft', 'studio_soft', 'outdoor_shade']).optional().nullable(),
  }).optional(),
});

// Response types
interface PreviewImage {
  url: string;
  seed: number;
}

interface HairstyleChip {
  label: string;
  preset: {
    length: 'short' | 'medium' | 'long';
    finish: 'textured' | 'clean';
  };
  reason: string;
}

interface GlassesChip {
  label: string;
  preset: {
    style: 'round' | 'rectangular' | 'browline' | 'aviator' | 'geometric';
  };
  reason: string;
}

interface PreviewResponse {
  images: PreviewImage[];
  disclaimers: string[];
  appliedChanges: string[];
  recommendedOptions: {
    hairstyleChips: HairstyleChip[];
    glassesChips: GlassesChip[];
  };
  reachability: {
    estimatedWeeks: { min: number; max: number };
    confidence: number;
    assumptions: string[];
  };
}

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

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Invalid request', {
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const {
      frontPhotoBase64,
      faceShape,
      faceShapeConfidence,
      photoQuality,
      currentHairLength,
      isMinor,
      options,
    } = validation.data;

    // Normalize values
    const normalizedFaceShape = faceShape || undefined;
    const normalizedFaceShapeConfidence = faceShapeConfidence ?? 0.7;
    const normalizedPhotoQuality = photoQuality ?? 0.7;
    const normalizedCurrentHairLength = currentHairLength || 'short';
    const normalizedIsMinor = isMinor ?? false;

    // Provide defaults for options
    const safeOptions = options || {};
    const requestedLevel = safeOptions.level || 2;

    // Normalize glasses
    const normalizedGlasses = safeOptions.glasses
      ? {
          enabled: safeOptions.glasses.enabled,
          style: safeOptions.glasses.style || undefined,
        }
      : { enabled: false };

    // Normalize grooming
    const normalizedGrooming = safeOptions.grooming
      ? {
          facialHair: safeOptions.grooming.facialHair || undefined,
          brows: safeOptions.grooming.brows || undefined,
        }
      : undefined;

    // Normalize lighting
    const normalizedLighting = safeOptions.lighting || undefined;

    // Enforce minor restrictions
    const effectiveLevel = normalizedIsMinor ? 1 : requestedLevel;
    const effectiveOptions: FacePreviewOptions = {
      level: effectiveLevel as 1 | 2 | 3,
      hairstyle: safeOptions.hairstyle || { length: 'short', finish: 'textured' },
      glasses: normalizedGlasses,
      grooming: normalizedGrooming,
      lighting: normalizedLighting,
    };

    // Compute hash for caching/determinism
    const imageHash = computeImageHash(frontPhotoBase64);
    const optionsHash = JSON.stringify(effectiveOptions);
    const cacheKey = `${imageHash}-${optionsHash}`;
    const seed = getSeedFromHash(imageHash + optionsHash.slice(0, 16));

    // Check cache
    const cachedResult = getCachedResult<PreviewResponse>(cacheKey, ENDPOINT_VERSION);
    if (cachedResult) {
      console.log('Returning cached preview for hash:', imageHash.slice(0, 8));
      return NextResponse.json(success(cachedResult));
    }

    // Check API key
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'Image generation service not configured'),
        { status: 500 }
      );
    }

    // Get change budget for this level
    const changeBudget = getChangeBudget(effectiveLevel as 1 | 2 | 3);

    console.log('Generating face preview with Replicate, seed:', seed);
    console.log('Effective options:', JSON.stringify(effectiveOptions, null, 2));

    // Generate enhanced image using Replicate with styling options
    // This preserves identity while applying styling changes
    let generatedImageUrl: string | null = null;
    
    try {
      console.log('Starting image generation with options:', JSON.stringify(effectiveOptions, null, 2));
      generatedImageUrl = await enhanceFaceImage(frontPhotoBase64, {
        hairstyle: effectiveOptions.hairstyle,
        glasses: effectiveOptions.glasses,
        grooming: effectiveOptions.grooming,
        lighting: effectiveOptions.lighting,
        seed: seed,
      });
      console.log('Replicate image generated:', !!generatedImageUrl, generatedImageUrl ? `URL length: ${generatedImageUrl.length}` : 'null');
    } catch (apiError) {
      console.error('Replicate generation failed:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown';
      const errorString = String(apiError);

      // Check for rate limiting (429 or rate limit messages)
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('rate') ||
        errorMessage.includes('limit') ||
        errorMessage.includes('Too Many Requests') ||
        errorString.includes('429') ||
        errorString.includes('rate')
      ) {
        return NextResponse.json(
          error(
            ErrorCodes.RATE_LIMITED,
            'API rate limit reached. Please wait 1-2 minutes and try again. Free tier has limited requests per minute.',
            { retryAfter: 120 }
          ),
          { status: 429 }
        );
      }

      // Don't fail completely - continue with recommendations
      console.log('Continuing without generated image (non-rate-limit error)');
    }

    // Build preview images array
    const previewImages: PreviewImage[] = [];
    
    if (generatedImageUrl) {
      console.log('Adding generated image to response, length:', generatedImageUrl.length);
      previewImages.push({
        url: generatedImageUrl,
        seed,
      });
    } else {
      console.warn('No generated image URL - continuing with recommendations only');
    }

    // Get style recommendations
    const styleRecs = getFaceStyleRecommendations(
      normalizedFaceShape || 'oval',
      normalizedFaceShapeConfidence
    );

    // Build recommendation chips
    const hairstyleChips: HairstyleChip[] = styleRecs.haircuts.slice(0, 3).map((cut) => ({
      label: cut.label,
      preset: {
        length: cut.length,
        finish: cut.finish,
      },
      reason: cut.suitability,
    }));

    const glassesChips: GlassesChip[] = styleRecs.glasses.slice(0, 3).map((g) => ({
      label: g.label,
      preset: { style: g.style },
      reason: g.suitability,
    }));

    // Calculate reachability
    const reachability = estimateFaceReachability(
      effectiveOptions,
      normalizedCurrentHairLength,
      normalizedPhotoQuality
    );

    // Describe what changed
    const appliedChanges = describeAppliedChanges(effectiveOptions, 'face');

    // Build disclaimers
    const disclaimers = [
      'AI-enhanced preview. Preserves your natural features.',
      'Estimated timelines are ranges and vary by individual.',
    ];
    if (normalizedIsMinor) {
      disclaimers.push('Minor detected: showing subtle styling improvements only.');
    }
    if (effectiveLevel < requestedLevel) {
      disclaimers.push(`Enhancement level reduced to ${effectiveLevel} for safety.`);
    }

    // Build final response
    const previewResponse: PreviewResponse = {
      images: previewImages,
      disclaimers,
      appliedChanges,
      recommendedOptions: {
        hairstyleChips,
        glassesChips,
      },
      reachability,
    };

    // Cache result
    setCachedResult(cacheKey, ENDPOINT_VERSION, previewResponse);

    return NextResponse.json(success(previewResponse));
  } catch (err) {
    console.error('Face preview error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Preview generation failed'),
      { status: 500 }
    );
  }
}
