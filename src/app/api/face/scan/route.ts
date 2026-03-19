import { NextRequest, NextResponse } from 'next/server';
import { getVisionModel, base64ToGenerativePart, extractJSON } from '@/lib/gemini';
import { faceScanRequestSchema, faceAnalysisResultSchema } from '@/lib/validations/face';
import { success, error, ErrorCodes } from '@/types/api';
import type { FaceAnalysisResult } from '@/types/face';
import { buildFaceAnalysisPrompt } from '@/lib/prompts/face-analysis';
import {
  computeImageHash,
  getSeedFromHash,
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

    // Parse and validate request
    const body = await request.json();
    const validation = faceScanRequestSchema.safeParse(body);

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

    const { frontPhotoBase64, sidePhotoBase64 } = validation.data;

    // Compute image hash for caching and determinism
    const imageHash = computeImageHash(frontPhotoBase64);
    const _seed = getSeedFromHash(imageHash); // For deterministic operations

    // Check cache first
    const cachedResult = getCachedResult<FaceAnalysisResult>(imageHash, ENDPOINT_VERSION);
    if (cachedResult) {
      console.log('Returning cached result for hash:', imageHash.slice(0, 8));
      return NextResponse.json(success(cachedResult));
    }

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        error(
          ErrorCodes.SERVER_ERROR,
          'AI service not configured. Please add GEMINI_API_KEY to environment variables.'
        ),
        { status: 500 }
      );
    }

    console.log('Starting face analysis...');
    console.log('Image hash:', imageHash.slice(0, 8));

    // Build prompt
    const prompt = buildFaceAnalysisPrompt(!!sidePhotoBase64);

    // Prepare image parts
    const imageParts = [
      base64ToGenerativePart(frontPhotoBase64, 'image/jpeg'),
    ];

    if (sidePhotoBase64) {
      imageParts.push(base64ToGenerativePart(sidePhotoBase64, 'image/jpeg'));
    }

    // Call Gemini API with temperature=0 for determinism
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

    // Parse JSON response
    let analysisData: FaceAnalysisResult;
    try {
      const rawData = extractJSON<FaceAnalysisResult & { isMinor?: boolean }>(text);
      
      // Handle minor detection
      const isMinor = rawData.isMinor;
      if (isMinor) {
        if (rawData.appearanceProfile) {
          rawData.appearanceProfile.dimorphismScore10 = undefined;
          rawData.appearanceProfile.masculinityFemininity = undefined;
        }
      }
      
      // Post-process for determinism and calibration
      analysisData = postProcessFaceResult(rawData);
      
      // Validate with zod - fail if validation fails
      const validated = faceAnalysisResultSchema.safeParse(analysisData);
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
          'Photo quality is too low for accurate analysis. Please retake with better lighting and ensure your face is clearly visible.',
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
    console.error('Face scan error:', err);
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
 * Post-process face analysis for determinism and calibration
 */
function postProcessFaceResult(
  raw: FaceAnalysisResult & { isMinor?: boolean }
): FaceAnalysisResult {
  // Round all scores to 1 decimal place for consistency
  const roundScore = (v: number) => Math.round(v * 10) / 10;
  const roundConfidence = (v: number) => Math.round(v * 100) / 100;
  
  // Process feature scores
  const featureScores = { ...raw.featureScores };
  for (const key of Object.keys(featureScores) as (keyof typeof featureScores)[]) {
    if (featureScores[key]) {
      featureScores[key] = {
        score: roundScore(featureScores[key].score),
        confidence: roundConfidence(featureScores[key].confidence),
      };
    }
  }
  
  // Process golden ratio signals
  const ratioSignals = raw.goldenRatioHarmony.ratioSignals.map(signal => ({
    ...signal,
    value: Math.round(signal.value * 1000) / 1000,
    confidence: roundConfidence(signal.confidence),
  }));
  
  // Calculate calibrated overall score
  const overallConfidence = roundConfidence(raw.overall.confidence);
  let currentScore = roundScore(raw.overall.currentScore10);
  
  // Apply honest extremes rule
  if (overallConfidence < CONFIDENCE_THRESHOLDS.allowExtremes) {
    currentScore = Math.max(2, Math.min(8, currentScore));
  }
  
  // Calculate potential range (modifiable factors only)
  const skinScore = featureScores.skin?.score ?? 5;
  const hairScore = featureScores.hair?.score ?? 5;
  const skinRoom = Math.max(0, (10 - skinScore) * 0.15);
  const hairRoom = Math.max(0, (10 - hairScore) * 0.1);
  let maxPotential = Math.min(currentScore + skinRoom + hairRoom + 0.3, currentScore + 1.5, 9.5);
  
  // Widen range if confidence is low
  if (overallConfidence < 0.6) {
    maxPotential = Math.min(maxPotential + 0.3, 9.5);
  }
  
  return {
    ...raw,
    goldenRatioHarmony: {
      harmonyIndex10: roundScore(raw.goldenRatioHarmony.harmonyIndex10),
      ratioSignals: ratioSignals.slice(0, 6),
    },
    symmetryIndex10: roundScore(raw.symmetryIndex10),
    thirdsBalance10: roundScore(raw.thirdsBalance10),
    featureScores,
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
 * Apply confidence gating for marginal quality photos
 */
function applyConfidenceGating(data: FaceAnalysisResult): FaceAnalysisResult {
  // Reduce confidence
  const gatedConfidence = Math.min(data.overall.confidence, 0.6);
  
  // Widen potential range
  const currentScore = data.overall.currentScore10;
  const potentialMin = Math.max(currentScore - 0.5, 1);
  const potentialMax = Math.min(currentScore + 2, 10);
  
  // Reduce feature score confidence
  const gatedFeatures = { ...data.featureScores };
  for (const key of Object.keys(gatedFeatures) as (keyof typeof gatedFeatures)[]) {
    if (gatedFeatures[key]) {
      gatedFeatures[key] = {
        ...gatedFeatures[key],
        confidence: Math.min(gatedFeatures[key].confidence, 0.5),
      };
    }
  }
  
  return {
    ...data,
    featureScores: gatedFeatures,
    overall: {
      ...data.overall,
      confidence: gatedConfidence,
      potentialRange: {
        min: Math.round(potentialMin * 10) / 10,
        max: Math.round(potentialMax * 10) / 10,
      },
    },
  };
}
