import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { success, error, ErrorCodes } from '@/types/api';
import { FoodSearchSchema, type Food } from '@/types/tracker';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 15;

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

interface MealItemWithFood {
  food_id: string | null;
  foods: DbFood | null;
}

function dbFoodToFood(dbFood: DbFood): Food {
  return {
    id: dbFood.id,
    source: dbFood.source as Food['source'],
    externalId: dbFood.external_id,
    name: dbFood.name,
    brand: dbFood.brand,
    servingSizeG: dbFood.serving_size_g,
    caloriesPer100g: dbFood.calories_per_100g,
    proteinPer100g: dbFood.protein_per_100g,
    carbsPer100g: dbFood.carbs_per_100g,
    fatsPer100g: dbFood.fats_per_100g,
    fiberPer100g: dbFood.fiber_per_100g,
    createdBy: dbFood.created_by,
    createdAt: dbFood.created_at,
  };
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    const validation = FoodSearchSchema.safeParse({
      q,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Invalid search parameters', {
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const { q: query, limit } = validation.data;
    const supabase = await getAuthClient();

    // Get current user for custom foods
    const { data: { user } } = await supabase.auth.getUser();

    // Search foods - prioritize user's custom foods, then public foods
    let queryBuilder = supabase
      .from('foods')
      .select('*', { count: 'exact' })
      .ilike('name', `%${query}%`);

    // If user is logged in, include their custom foods
    // The RLS policy handles this: non-custom foods are public, custom foods only for creator
    if (user) {
      queryBuilder = queryBuilder.or(`source.neq.custom,created_by.eq.${user.id}`);
    } else {
      queryBuilder = queryBuilder.neq('source', 'custom');
    }

    const { data: foodsData, count, error: searchError } = await queryBuilder
      .order('name')
      .limit(limit);

    if (searchError) {
      console.error('Food search error:', searchError);
      return NextResponse.json(
        error(ErrorCodes.DATABASE_ERROR, 'Failed to search foods'),
        { status: 500 }
      );
    }

    const foods = (foodsData || []).map(dbFoodToFood);

    // Also get user's recent foods if logged in (hard cap at 10)
    let recentFoods: Food[] = [];
    if (user) {
      const { data: recentData } = await supabase
        .from('meal_items')
        .select('food_id, foods(*)')
        .not('food_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentData) {
        const typedRecentData = recentData as MealItemWithFood[];
        const seen = new Set<string>();
        recentFoods = typedRecentData
          .filter(item => item.foods && item.food_id && !seen.has(item.food_id))
          .map(item => {
            seen.add(item.food_id!);
            return dbFoodToFood(item.foods!);
          });
      }
    }

    return NextResponse.json(success({
      foods,
      recentFoods,
      total: count || 0,
    }));
  } catch (err) {
    console.error('Food search error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Failed to search foods'),
      { status: 500 }
    );
  }
}
