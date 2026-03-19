import { NextRequest, NextResponse } from 'next/server';
import { success, error, ErrorCodes } from '@/types/api';
import { CreateCustomFoodSchema, type Food } from '@/types/tracker';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { validateCSRFToken } from '@/lib/csrf';

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
// API HANDLER
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
        error(ErrorCodes.UNAUTHORIZED, 'Please sign in to create custom foods'),
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = CreateCustomFoodSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        error(ErrorCodes.VALIDATION_ERROR, 'Invalid food data', {
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const foodInput = validation.data;

    // Insert custom food
    const { data: foodData, error: insertError } = await supabase
      .from('foods')
      .insert({
        source: 'custom',
        name: foodInput.name,
        brand: foodInput.brand,
        serving_size_g: foodInput.servingSizeG,
        calories_per_100g: foodInput.caloriesPer100g,
        protein_per_100g: foodInput.proteinPer100g,
        carbs_per_100g: foodInput.carbsPer100g,
        fats_per_100g: foodInput.fatsPer100g,
        fiber_per_100g: foodInput.fiberPer100g,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !foodData) {
      console.error('Custom food insert error:', insertError);
      return NextResponse.json(
        error(ErrorCodes.DATABASE_ERROR, 'Failed to create custom food'),
        { status: 500 }
      );
    }

    const food: Food = {
      id: foodData.id,
      source: 'custom',
      name: foodData.name,
      brand: foodData.brand,
      servingSizeG: foodData.serving_size_g,
      caloriesPer100g: foodData.calories_per_100g,
      proteinPer100g: foodData.protein_per_100g,
      carbsPer100g: foodData.carbs_per_100g,
      fatsPer100g: foodData.fats_per_100g,
      fiberPer100g: foodData.fiber_per_100g,
      createdBy: foodData.created_by,
      createdAt: foodData.created_at,
    };

    return NextResponse.json(success({ food }), { status: 201 });
  } catch (err) {
    console.error('Create custom food error:', err);
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, 'Failed to create custom food'),
      { status: 500 }
    );
  }
}
