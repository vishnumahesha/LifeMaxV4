import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { success, error, ErrorCodes } from '@/types/api';
import { CreateMealSchema, type Meal, type MealItem } from '@/types/tracker';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { validateCSRFToken } from '@/lib/csrf';

export const maxDuration = 30;

// ============================================
// AUTH CLIENT
// ============================================

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// ============================================
// DATABASE HELPERS
// ============================================

interface DbMeal {
  id: string;
  user_id: string;
  created_at: string;
  consumed_at: string;
  meal_type: string;
  source: string;
  photo_url?: string;
  scan_hash?: string;
  notes_hash?: string;
  combined_hash?: string;
  refined_from_hash?: string;
  ai_confidence?: number;
  user_notes?: string;
  notes?: string;
}

interface DbMealItem {
  id: string;
  meal_id: string;
  food_id?: string;
  name: string;
  portion_g?: number;
  portion_unit?: string;
  portion_qty?: number;
  calories_est_min: number;
  calories_est_max: number;
  protein_est_min: number;
  protein_est_max: number;
  carbs_est_min: number;
  carbs_est_max: number;
  fats_est_min: number;
  fats_est_max: number;
  fiber_est_min: number;
  fiber_est_max: number;
  confidence: number;
  method: string;
  user_override: boolean;
  refinement_source?: string;
  raw_json?: unknown;
}

function dbMealToMeal(dbMeal: DbMeal, items: MealItem[]): Meal {
  return {
    id: dbMeal.id,
    userId: dbMeal.user_id,
    createdAt: dbMeal.created_at,
    consumedAt: dbMeal.consumed_at,
    mealType: dbMeal.meal_type as Meal['mealType'],
    source: dbMeal.source as Meal['source'],
    photoUrl: dbMeal.photo_url,
    scanHash: dbMeal.scan_hash,
    notesHash: dbMeal.notes_hash,
    combinedHash: dbMeal.combined_hash,
    refinedFromHash: dbMeal.refined_from_hash,
    aiConfidence: dbMeal.ai_confidence,
    userNotes: dbMeal.user_notes,
    notes: dbMeal.notes,
    items,
  };
}

function dbItemToItem(dbItem: DbMealItem): MealItem {
  return {
    id: dbItem.id,
    mealId: dbItem.meal_id,
    foodId: dbItem.food_id,
    name: dbItem.name,
    portionG: dbItem.portion_g,
    portionUnit: dbItem.portion_unit,
    portionQty: dbItem.portion_qty,
    caloriesEstMin: dbItem.calories_est_min,
    caloriesEstMax: dbItem.calories_est_max,
    proteinEstMin: dbItem.protein_est_min,
    proteinEstMax: dbItem.protein_est_max,
    carbsEstMin: dbItem.carbs_est_min,
    carbsEstMax: dbItem.carbs_est_max,
    fatsEstMin: dbItem.fats_est_min,
    fatsEstMax: dbItem.fats_est_max,
    fiberEstMin: dbItem.fiber_est_min,
    fiberEstMax: dbItem.fiber_est_max,
    confidence: dbItem.confidence,
    method: dbItem.method as MealItem['method'],
    userOverride: dbItem.user_override,
    refinementSource: dbItem.refinement_source as MealItem['refinementSource'],
    rawJson: dbItem.raw_json,
  };
}

// ============================================
// GET /api/meals?date=YYYY-MM-DD
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        error(ErrorCodes.UNAUTHORIZED, 'Please sign in to view meals'),
        { status: 401 }
      );
    }

    // Get date from query
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const offsetParam = searchParams.get('offset');
    const limitParam = searchParams.get('limit');

    if (!dateStr) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Date parameter required (YYYY-MM-DD)'),
        { status: 400 }
      );
    }

    // Validate date format
    const dateMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateMatch) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Invalid date format. Use YYYY-MM-DD'),
        { status: 400 }
      );
    }

    // Parse pagination params with hard cap of 200
    const offset = Math.max(0, parseInt(offsetParam || '0', 10));
    const requestedLimit = parseInt(limitParam || '50', 10);
    const limit = Math.min(Math.max(1, requestedLimit), 200);

    // Fetch meals for the date with pagination
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    // Fetch one extra to detect if there are more results
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('consumed_at', startOfDay)
      .lte('consumed_at', endOfDay)
      .order('consumed_at', { ascending: true })
      .range(offset, offset + limit);

    if (mealsError) {
      console.error('Meals fetch error:', mealsError);
      return NextResponse.json(
        error(ErrorCodes.DATABASE_ERROR, 'Failed to fetch meals'),
        { status: 500 }
      );
    }

    // Check if there are more results
    const hasMore = (mealsData || []).length > limit;
    const mealsToReturn = hasMore ? (mealsData || []).slice(0, limit) : (mealsData || []);
    const nextOffset = hasMore ? offset + limit : null;

    // Fetch items for all meals with hard cap
    const mealIds = mealsToReturn.map(m => m.id);
    let itemsData: DbMealItem[] = [];

    if (mealIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('meal_items')
        .select('*')
        .in('meal_id', mealIds)
        .limit(200);

      if (itemsError) {
        console.error('Items fetch error:', itemsError);
      } else {
        itemsData = items || [];
      }
    }

    // Group items by meal
    const itemsByMeal = itemsData.reduce((acc, item) => {
      if (!acc[item.meal_id]) acc[item.meal_id] = [];
      acc[item.meal_id].push(dbItemToItem(item));
      return acc;
    }, {} as Record<string, MealItem[]>);

    // Build meals with items
    const meals = mealsToReturn.map(dbMeal =>
      dbMealToMeal(dbMeal, itemsByMeal[dbMeal.id] || [])
    );

    // Calculate totals
    const totals = {
      calories: { min: 0, max: 0 },
      protein: { min: 0, max: 0 },
      carbs: { min: 0, max: 0 },
      fats: { min: 0, max: 0 },
      fiber: { min: 0, max: 0 },
    };

    let totalConfidence = 0;
    let itemCount = 0;

    itemsData.forEach(item => {
      totals.calories.min += item.calories_est_min;
      totals.calories.max += item.calories_est_max;
      totals.protein.min += item.protein_est_min;
      totals.protein.max += item.protein_est_max;
      totals.carbs.min += item.carbs_est_min;
      totals.carbs.max += item.carbs_est_max;
      totals.fats.min += item.fats_est_min;
      totals.fats.max += item.fats_est_max;
      totals.fiber.min += item.fiber_est_min;
      totals.fiber.max += item.fiber_est_max;
      totalConfidence += item.confidence;
      itemCount++;
    });

    const dayConfidence = itemCount > 0 ? totalConfidence / itemCount : 1;

    // Fetch user's nutrition targets if available
    let targets = null;
    const { data: targetData } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (targetData) {
      targets = {
        calories: targetData.calories,
        protein: targetData.protein,
        carbs: targetData.carbs,
        fats: targetData.fats,
        fiber: targetData.fiber || 25,
        source: targetData.source || 'user_set',
      };
    }

    return NextResponse.json(success({
      date: dateStr,
      meals,
      totals,
      dayConfidence: Math.round(dayConfidence * 100) / 100,
      targets,
      pagination: {
        offset,
        limit,
        hasMore,
        nextOffset,
      },
    }));
  } catch (err) {
    console.error('GET meals error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Failed to fetch meals'),
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/meals
// ============================================

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        error(ErrorCodes.FORBIDDEN, 'Invalid CSRF token'),
        { status: 403 }
      );
    }

    const supabase = await getAuthClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        error(ErrorCodes.UNAUTHORIZED, 'Please sign in to log meals'),
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = CreateMealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Invalid meal data', {
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const mealInput = validation.data;

    // Calculate meal confidence from items
    const avgConfidence = mealInput.items.reduce((sum, item) => sum + item.confidence, 0) / mealInput.items.length;

    // Insert meal
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        consumed_at: mealInput.consumedAt,
        meal_type: mealInput.mealType,
        source: mealInput.source,
        photo_url: mealInput.photoUrl,
        scan_hash: mealInput.scanHash,
        notes_hash: mealInput.notesHash,
        combined_hash: mealInput.combinedHash,
        ai_confidence: avgConfidence,
        user_notes: mealInput.userNotes,
      })
      .select()
      .single();

    if (mealError || !mealData) {
      console.error('Meal insert error:', mealError);
      return NextResponse.json(
        error(ErrorCodes.DATABASE_ERROR, 'Failed to save meal'),
        { status: 500 }
      );
    }

    // Insert items
    const itemsToInsert = mealInput.items.map(item => ({
      meal_id: mealData.id,
      food_id: item.foodId,
      name: item.name,
      portion_g: item.portionG,
      portion_unit: item.portionUnit,
      portion_qty: item.portionQty,
      calories_est_min: item.caloriesEstMin,
      calories_est_max: item.caloriesEstMax,
      protein_est_min: item.proteinEstMin,
      protein_est_max: item.proteinEstMax,
      carbs_est_min: item.carbsEstMin,
      carbs_est_max: item.carbsEstMax,
      fats_est_min: item.fatsEstMin,
      fats_est_max: item.fatsEstMax,
      fiber_est_min: item.fiberEstMin,
      fiber_est_max: item.fiberEstMax,
      confidence: item.confidence,
      method: item.method,
      user_override: item.userOverride || false,
      refinement_source: item.refinementSource,
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('meal_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('Items insert error:', itemsError);
      // Delete the meal since items failed
      await supabase.from('meals').delete().eq('id', mealData.id);
      return NextResponse.json(
        error(ErrorCodes.DATABASE_ERROR, 'Failed to save meal items'),
        { status: 500 }
      );
    }

    const items = (itemsData || []).map(dbItemToItem);
    const meal = dbMealToMeal(mealData, items);

    return NextResponse.json(success({ meal }), { status: 201 });
  } catch (err) {
    console.error('POST meals error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Failed to create meal'),
      { status: 500 }
    );
  }
}
