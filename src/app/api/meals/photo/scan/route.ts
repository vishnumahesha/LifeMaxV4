import { NextRequest, NextResponse } from 'next/server';
import { getVisionModel, base64ToGenerativePart, extractJSON } from '@/lib/gemini';
import { success, error, ErrorCodes } from '@/types/api';
import { computeImageHash, computeNotesHash, computeCombinedHash } from '@/lib/tracker/hash';
import { getMealScanPrompt, getFoodValidationPrompt } from '@/lib/tracker/prompts';
import { createClient } from '@supabase/supabase-js';
import type { MealDraft, MealItemDraft, MealType } from '@/types/tracker';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const maxDuration = 60;

// ============================================
// TYPES FOR AI RESPONSE
// ============================================

interface AIDetectedItem {
  name: string;
  portion: {
    gRange: [number, number];
    unitHints?: string[];
  };
  macros: {
    caloriesRange: [number, number];
    proteinGRange: [number, number];
    carbsGRange: [number, number];
    fatsGRange: [number, number];
    fiberGRange: [number, number];
  };
  confidence: number;
  assumptions?: string[];
}

interface AIScanResult {
  photoQuality: {
    score: number;
    issues: string[];
  };
  detectedItems: AIDetectedItem[];
  mealConfidence: number;
  warnings: string[];
}

interface FoodValidation {
  isFood: boolean;
  confidence: number;
  reason: string;
}

// ============================================
// SUPABASE CLIENT
// ============================================

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// ============================================
// CACHE HELPERS
// ============================================

async function getCachedScan(combinedHash: string): Promise<MealDraft | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from('scan_cache')
      .select('result_json, photo_url')
      .eq('combined_hash', combinedHash)
      .single();

    if (dbError || !data) return null;

    const result = data.result_json as MealDraft;
    result.photoUrl = data.photo_url;
    return result;
  } catch {
    return null;
  }
}

async function setCachedScan(
  combinedHash: string,
  scanHash: string,
  notesHash: string | undefined,
  photoUrl: string,
  result: MealDraft
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('scan_cache').upsert({
      combined_hash: combinedHash,
      scan_hash: scanHash,
      notes_hash: notesHash || null,
      photo_url: photoUrl,
      result_json: result,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to cache scan result:', err);
  }
}

// ============================================
// IMAGE UPLOAD
// ============================================

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        const backoffDelay = delayMs * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

async function uploadPhotoToStorage(
  imageBase64: string,
  scanHash: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const supabase = getSupabaseAdmin();

    // Remove data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filePath = `meals/${scanHash}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      throw new Error('Failed to upload photo');
    }

    const { data: urlData } = supabase.storage
      .from('meal-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }, 3); // 3 attempts total (1 initial + 2 retries)
}

// ============================================
// FOOD VALIDATION
// ============================================

async function validateIsFood(imageBase64: string): Promise<FoodValidation> {
  try {
    const model = getVisionModel();
    const imagePart = base64ToGenerativePart(imageBase64, 'image/jpeg');
    const result = await model.generateContent([getFoodValidationPrompt(), imagePart]);
    const text = result.response.text();
    return extractJSON<FoodValidation>(text);
  } catch {
    // If validation fails, assume it's food and let the main scan handle it
    return { isFood: true, confidence: 0.5, reason: 'Validation skipped' };
  }
}

// ============================================
// MAIN SCAN LOGIC
// ============================================

async function scanMealPhoto(
  imageBase64: string,
  userNotes?: string
): Promise<AIScanResult> {
  const model = getVisionModel();
  const imagePart = base64ToGenerativePart(imageBase64, 'image/jpeg');
  const prompt = getMealScanPrompt(userNotes);

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();
  
  const parsed = extractJSON<AIScanResult>(text);
  
  // Validate and sanitize response
  return {
    photoQuality: {
      score: Math.max(0, Math.min(1, parsed.photoQuality?.score || 0.5)),
      issues: parsed.photoQuality?.issues || [],
    },
    detectedItems: (parsed.detectedItems || []).slice(0, 6).map(item => ({
      name: item.name || 'Unknown item',
      portion: {
        gRange: item.portion?.gRange || [50, 150],
        unitHints: item.portion?.unitHints || [],
      },
      macros: {
        caloriesRange: item.macros?.caloriesRange || [50, 200],
        proteinGRange: item.macros?.proteinGRange || [0, 20],
        carbsGRange: item.macros?.carbsGRange || [0, 30],
        fatsGRange: item.macros?.fatsGRange || [0, 15],
        fiberGRange: item.macros?.fiberGRange || [0, 5],
      },
      confidence: Math.max(0, Math.min(1, item.confidence || 0.5)),
      assumptions: item.assumptions || [],
    })),
    mealConfidence: Math.max(0, Math.min(1, parsed.mealConfidence || 0.5)),
    warnings: parsed.warnings || [],
  };
}

// ============================================
// CONVERT TO DRAFT FORMAT
// ============================================

function convertToDraft(
  scanResult: AIScanResult,
  photoUrl: string,
  scanHash: string,
  notesHash: string | undefined,
  combinedHash: string,
  mealType: MealType,
  consumedAt: string,
  hasNotes: boolean
): MealDraft {
  const items: MealItemDraft[] = scanResult.detectedItems.map(item => ({
    name: item.name,
    portionG: Math.round((item.portion.gRange[0] + item.portion.gRange[1]) / 2),
    portionUnit: item.portion.unitHints?.[0],
    caloriesRange: { min: item.macros.caloriesRange[0], max: item.macros.caloriesRange[1] },
    proteinRange: { min: item.macros.proteinGRange[0], max: item.macros.proteinGRange[1] },
    carbsRange: { min: item.macros.carbsGRange[0], max: item.macros.carbsGRange[1] },
    fatsRange: { min: item.macros.fatsGRange[0], max: item.macros.fatsGRange[1] },
    fiberRange: { min: item.macros.fiberGRange[0], max: item.macros.fiberGRange[1] },
    confidence: item.confidence,
    method: 'ai' as const,
    assumptions: item.assumptions,
  }));

  return {
    photoUrl,
    scanHash,
    notesHash,
    combinedHash,
    mealType,
    consumedAt,
    items,
    mealConfidence: scanResult.mealConfidence,
    warnings: scanResult.warnings,
    photoQuality: scanResult.photoQuality,
  };
}

// ============================================
// API HANDLER
// ============================================

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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mealType = (formData.get('mealType') as MealType) || 'snack';
    const consumedAt = (formData.get('consumedAt') as string) || new Date().toISOString();
    const userNotes = formData.get('userNotes') as string | null;

    if (!file) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'No file provided'),
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'File must be an image'),
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Image must be under 10MB'),
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Compute hashes
    const scanHash = computeImageHash(base64Image);
    const notesHash = computeNotesHash(userNotes);
    const combinedHash = computeCombinedHash(scanHash, notesHash);

    console.log('Meal scan request:', {
      scanHash: scanHash.slice(0, 8),
      hasNotes: !!userNotes,
      combinedHash: combinedHash.slice(0, 8),
    });

    // Check cache first
    const cachedResult = await getCachedScan(combinedHash);
    if (cachedResult) {
      console.log('Returning cached scan result');
      return NextResponse.json(success({ draft: cachedResult }));
    }

    // Validate this is a food image
    const validation = await validateIsFood(base64Image);
    if (!validation.isFood && validation.confidence > 0.7) {
      return NextResponse.json(
        error(
          ErrorCodes.VALIDATION_ERROR,
          'This doesn\'t appear to be a food photo. Please upload a meal image.',
          { reason: validation.reason }
        ),
        { status: 400 }
      );
    }

    // Upload photo to storage
    let photoUrl: string;
    try {
      photoUrl = await uploadPhotoToStorage(base64Image, scanHash);
    } catch (uploadErr) {
      console.error('Photo upload failed:', uploadErr);
      // Continue without storage URL - use data URL as fallback
      photoUrl = base64Image;
    }

    // Run AI scan
    let scanResult: AIScanResult;
    try {
      scanResult = await scanMealPhoto(base64Image, userNotes || undefined);
    } catch (scanErr) {
      console.error('Meal scan failed:', scanErr);
      const errorMessage = scanErr instanceof Error ? scanErr.message : 'Unknown error';
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
        return NextResponse.json(
          error(ErrorCodes.RATE_LIMITED, 'Service busy. Please try again shortly.'),
          { status: 429 }
        );
      }
      if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        return NextResponse.json(
          error(ErrorCodes.ANALYSIS_FAILED, 'Image could not be processed. Try a clearer photo.'),
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'Failed to analyze meal'),
        { status: 500 }
      );
    }

    // Check photo quality
    if (scanResult.photoQuality.score < 0.3) {
      return NextResponse.json(
        error(
          ErrorCodes.LOW_QUALITY,
          'Photo quality too low for accurate analysis. Please take a clearer photo.',
          { issues: scanResult.photoQuality.issues }
        ),
        { status: 400 }
      );
    }

    // Convert to draft format
    const draft = convertToDraft(
      scanResult,
      photoUrl,
      scanHash,
      notesHash || undefined,
      combinedHash,
      mealType,
      consumedAt,
      !!userNotes
    );

    // Add note about refinement if notes were provided
    if (userNotes) {
      draft.warnings.push('Refined with your details');
    }

    // Cache the result
    await setCachedScan(combinedHash, scanHash, notesHash || undefined, photoUrl, draft);

    return NextResponse.json(success({ draft }));
  } catch (err) {
    console.error('Photo scan error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Failed to process meal photo'),
      { status: 500 }
    );
  }
}
