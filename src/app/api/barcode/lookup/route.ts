import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { success, error, ErrorCodes } from '@/types/api';
import { BarcodeLookupSchema, type Food } from '@/types/tracker';

export const maxDuration = 30;

const OPEN_FOOD_FACTS_URL = process.env.OPEN_FOOD_FACTS_BASE_URL || 'https://world.openfoodfacts.org';

// ============================================
// SUPABASE CLIENT
// ============================================

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// ============================================
// OPEN FOOD FACTS API
// ============================================

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'fiber_100g'?: number;
  };
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

async function fetchFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_URL}/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'LifeMAX-App/1.0 (contact@lifemax.app)',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }

    return data.product;
  } catch (err) {
    console.error('Open Food Facts fetch error:', err);
    return null;
  }
}

function mapOpenFoodFactsToFood(product: OpenFoodFactsProduct): Omit<Food, 'id' | 'createdAt'> {
  const nutriments = product.nutriments || {};
  
  // Parse serving size (e.g., "100g", "1 cup (240ml)")
  let servingSizeG: number | undefined;
  if (product.serving_size) {
    const match = product.serving_size.match(/(\d+)\s*g/i);
    if (match) {
      servingSizeG = parseInt(match[1], 10);
    }
  }

  return {
    source: 'open_food_facts',
    externalId: product.code,
    name: product.product_name || `Product ${product.code}`,
    brand: product.brands,
    servingSizeG,
    caloriesPer100g: nutriments['energy-kcal_100g'],
    proteinPer100g: nutriments['proteins_100g'],
    carbsPer100g: nutriments['carbohydrates_100g'],
    fatsPer100g: nutriments['fat_100g'],
    fiberPer100g: nutriments['fiber_100g'],
  };
}

// ============================================
// CACHE HELPERS
// ============================================

interface DbFood {
  id: string;
  source: string;
  external_id?: string;
  name: string;
  brand?: string;
  serving_size_g?: number;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fats_per_100g?: number;
  fiber_per_100g?: number;
  created_by?: string;
  created_at: string;
}

interface BarcodeCacheRow {
  food_id: string;
  foods: DbFood | null;
}

async function getCachedBarcode(barcode: string): Promise<Food | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from('barcode_cache')
      .select('food_id, foods(*)')
      .eq('barcode', barcode)
      .single();

    if (dbError || !data || !data.foods) return null;

    const typedData = data as BarcodeCacheRow;
    const food = typedData.foods;

    return {
      id: food.id,
      source: food.source as Food['source'],
      externalId: food.external_id,
      name: food.name,
      brand: food.brand,
      servingSizeG: food.serving_size_g,
      caloriesPer100g: food.calories_per_100g,
      proteinPer100g: food.protein_per_100g,
      carbsPer100g: food.carbs_per_100g,
      fatsPer100g: food.fats_per_100g,
      fiberPer100g: food.fiber_per_100g,
      createdBy: food.created_by,
      createdAt: food.created_at,
    };
  } catch {
    return null;
  }
}

async function cacheBarcode(barcode: string, food: Food, rawJson: unknown): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('barcode_cache').upsert({
      barcode,
      food_id: food.id,
      raw_json: rawJson,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Barcode cache error:', err);
  }
}

async function createFoodFromProduct(
  productData: Omit<Food, 'id' | 'createdAt'>
): Promise<Food | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if food already exists
    const { data: existing } = await supabase
      .from('foods')
      .select('*')
      .eq('source', productData.source)
      .eq('external_id', productData.externalId)
      .single();

    if (existing) {
      return {
        id: existing.id,
        source: existing.source,
        externalId: existing.external_id,
        name: existing.name,
        brand: existing.brand,
        servingSizeG: existing.serving_size_g,
        caloriesPer100g: existing.calories_per_100g,
        proteinPer100g: existing.protein_per_100g,
        carbsPer100g: existing.carbs_per_100g,
        fatsPer100g: existing.fats_per_100g,
        fiberPer100g: existing.fiber_per_100g,
        createdAt: existing.created_at,
      };
    }

    // Create new food
    const { data: newFood, error: insertError } = await supabase
      .from('foods')
      .insert({
        source: productData.source,
        external_id: productData.externalId,
        name: productData.name,
        brand: productData.brand,
        serving_size_g: productData.servingSizeG,
        calories_per_100g: productData.caloriesPer100g,
        protein_per_100g: productData.proteinPer100g,
        carbs_per_100g: productData.carbsPer100g,
        fats_per_100g: productData.fatsPer100g,
        fiber_per_100g: productData.fiberPer100g,
      })
      .select()
      .single();

    if (insertError || !newFood) {
      console.error('Food insert error:', insertError);
      return null;
    }

    return {
      id: newFood.id,
      source: newFood.source,
      externalId: newFood.external_id,
      name: newFood.name,
      brand: newFood.brand,
      servingSizeG: newFood.serving_size_g,
      caloriesPer100g: newFood.calories_per_100g,
      proteinPer100g: newFood.protein_per_100g,
      carbsPer100g: newFood.carbs_per_100g,
      fatsPer100g: newFood.fats_per_100g,
      fiberPer100g: newFood.fiber_per_100g,
      createdAt: newFood.created_at,
    };
  } catch (err) {
    console.error('Create food error:', err);
    return null;
  }
}

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = BarcodeLookupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Invalid barcode format', {
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const { barcode } = validation.data;
    console.log('Barcode lookup:', barcode);

    // Check cache first
    const cachedFood = await getCachedBarcode(barcode);
    if (cachedFood) {
      console.log('Returning cached barcode result');
      return NextResponse.json(success({
        food: cachedFood,
        source: 'cache',
        confidence: 0.95,
      }));
    }

    // Fetch from Open Food Facts
    const product = await fetchFromOpenFoodFacts(barcode);
    
    if (!product) {
      return NextResponse.json(
        error(ErrorCodes.NOT_FOUND, 'Product not found for this barcode', {
          barcode,
          suggestion: 'Try searching by name or add as custom food',
        }),
        { status: 404 }
      );
    }

    // Map to food format
    const foodData = mapOpenFoodFactsToFood(product);

    // Create/get food in database
    const food = await createFoodFromProduct(foodData);
    
    if (!food) {
      return NextResponse.json(
        error(ErrorCodes.DATABASE_ERROR, 'Failed to save food data'),
        { status: 500 }
      );
    }

    // Cache the barcode lookup
    await cacheBarcode(barcode, food, product);

    // Determine confidence based on data completeness
    let confidence = 0.9;
    if (!food.caloriesPer100g) confidence -= 0.2;
    if (!food.proteinPer100g && !food.carbsPer100g && !food.fatsPer100g) confidence -= 0.2;
    if (!food.name || food.name.startsWith('Product ')) confidence -= 0.1;

    return NextResponse.json(success({
      food,
      source: 'open_food_facts',
      confidence: Math.max(0.5, confidence),
    }));
  } catch (err) {
    console.error('Barcode lookup error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Failed to lookup barcode'),
      { status: 500 }
    );
  }
}
