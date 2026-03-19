import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { success, error, ErrorCodes } from '@/types/api';
import { computeImageHash, getSeedFromHash, getCachedResult, setCachedResult } from '@/lib/scoring';
import { getBodyStyleRecommendations } from '@/lib/style-library';
import {
  estimateBodyReachability,
  getChangeBudget,
  describeAppliedChanges,
  type BodyPreviewOptions,
} from '@/lib/reachability';
import type { KibbeType } from '@/types/body';
import { enhanceBodyImage } from '@/lib/replicate';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const maxDuration = 60;

const ENDPOINT_VERSION = '2.0.0'; // Bumped for Replicate integration

// Request schema following spec
const requestSchema = z.object({
  frontPhotoBase64: z.string().min(100),
  sidePhotoBase64: z.string().optional(),
  backPhotoBase64: z.string().optional(),
  kibbeType: z.string().nullable().optional(),
  kibbeConfidence: z.number().min(0).max(1).optional().default(0.5),
  photoQuality: z.number().min(0).max(1).optional().default(0.7),
  isMinor: z.boolean().optional().default(false),
  options: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    goal: z.enum(['get_leaner', 'build_muscle', 'balanced']),
    outfit: z.enum(['fitted_basics', 'athleisure', 'smart_casual', 'formal']),
    postureFocus: z.enum(['neutral', 'improve_posture']).optional(),
    variations: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(1),
  }),
});

// Response types
interface PreviewImage {
  url: string;
  seed: number;
}

interface OutfitChip {
  label: string;
  preset: {
    outfit: 'fitted_basics' | 'athleisure' | 'smart_casual' | 'formal';
  };
  reason: string;
}

interface BodyPreviewResponse {
  images: PreviewImage[];
  disclaimers: string[];
  appliedChanges: string[];
  recommendedOutfits: OutfitChip[];
  silhouetteTips: string[];
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
      sidePhotoBase64,
      kibbeType,
      kibbeConfidence,
      photoQuality,
      isMinor,
      options,
    } = validation.data;

    // Enforce minor restrictions
    const effectiveLevel = isMinor ? 1 : options.level;
    const effectiveOptions: BodyPreviewOptions = {
      ...options,
      level: effectiveLevel as 1 | 2 | 3,
    };

    // Compute hash for caching/determinism
    const imageHash = computeImageHash(frontPhotoBase64);
    const optionsHash = JSON.stringify(effectiveOptions);
    const cacheKey = `body-${imageHash}-${optionsHash}`;
    const seed = getSeedFromHash(imageHash + optionsHash.slice(0, 16));

    // Check cache
    const cachedResult = getCachedResult<BodyPreviewResponse>(cacheKey, ENDPOINT_VERSION);
    if (cachedResult) {
      console.log('Returning cached body preview for hash:', imageHash.slice(0, 8));
      return NextResponse.json(success(cachedResult));
    }

    // Check API key
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'Image generation service not configured'),
        { status: 500 }
      );
    }

    const hasSideView = !!sidePhotoBase64;

    console.log('Generating body preview with Replicate, seed:', seed);

    // Generate enhanced image using Replicate
    let generatedImageUrl: string | null = null;
    
    try {
      generatedImageUrl = await enhanceBodyImage(frontPhotoBase64);
      console.log('Replicate body image generated:', !!generatedImageUrl);
    } catch (apiError) {
      console.error('Replicate body generation failed:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown';

      if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
        return NextResponse.json(
          error(ErrorCodes.RATE_LIMITED, 'Please wait and try again'),
          { status: 429 }
        );
      }

      // Don't fail completely - continue with recommendations
      console.log('Continuing without generated image');
    }

    // Build preview images array
    const previewImages: PreviewImage[] = [];
    
    if (generatedImageUrl) {
      previewImages.push({
        url: generatedImageUrl,
        seed,
      });
    }

    // Get style recommendations based on Kibbe type
    const styleRecs = getBodyStyleRecommendations(
      kibbeType as KibbeType | null,
      kibbeConfidence || 0.5
    );

    // Build outfit chips
    const recommendedOutfits: OutfitChip[] = styleRecs.outfits.slice(0, 3).map((outfit) => ({
      label: outfit.label,
      preset: { outfit: outfit.silhouette },
      reason: outfit.suitability,
    }));

    // Calculate reachability
    const reachability = estimateBodyReachability(
      effectiveOptions,
      photoQuality || 0.7,
      hasSideView
    );

    // Describe what changed
    const appliedChanges = describeAppliedChanges(effectiveOptions, 'body');

    // Build disclaimers
    const disclaimers = [
      'AI-enhanced preview. Preserves your natural body and features.',
      'Styling recommendations based on your body type analysis.',
      'Actual results depend on individual factors and consistency.',
    ];
    if (isMinor) {
      disclaimers.push('Minor detected: showing styling and posture improvements only.');
    }
    if (!hasSideView) {
      disclaimers.push('Side view not provided; posture estimates less precise.');
    }
    if (effectiveLevel < options.level) {
      disclaimers.push(`Enhancement level reduced to ${effectiveLevel} for safety.`);
    }

    // Build final response
    const previewResponse: BodyPreviewResponse = {
      images: previewImages,
      disclaimers,
      appliedChanges,
      recommendedOutfits,
      silhouetteTips: styleRecs.silhouetteTips,
      reachability,
    };

    // Cache result
    setCachedResult(cacheKey, ENDPOINT_VERSION, previewResponse);

    return NextResponse.json(success(previewResponse));
  } catch (err) {
    console.error('Body preview error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Preview generation failed'),
      { status: 500 }
    );
  }
}
