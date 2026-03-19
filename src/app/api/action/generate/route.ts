import { NextRequest, NextResponse } from 'next/server';
import { getTextModel, extractJSON } from '@/lib/gemini';
import { success, error, ErrorCodes } from '@/types/api';
import type { ActionPlan, MacroTargets, WorkoutPlan, WorkoutDay, Exercise } from '@/types/body';
import { buildActionPlanPrompt } from '@/lib/prompts/action-plan';
import { z } from 'zod';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const requestSchema = z.object({
  stats: z.object({
    height: z.string(),
    weight: z.string(),
    age: z.number().optional(),
    activityLevel: z.string().optional(),
  }),
  goal: z.string(),
  targetAreas: z.array(z.string()).optional(),
});

export const maxDuration = 60;

// Response shape from AI
interface AIActionPlanResponse {
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  workout: {
    split: string;
    daysPerWeek: number;
    emphasis: string[];
    days: Array<{
      name: string;
      focus: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        notes?: string;
      }>;
    }>;
    notes: string[];
  };
  priorityAreas: string[];
  timeline: string;
}

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
          `Rate limit exceeded. Please try again in ${Math.ceil((rateLimitResult.reset - Date.now()) / 1000)} seconds.`
        ),
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

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

    const { stats, goal, targetAreas } = validation.data;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, 'AI service not configured. Please add GEMINI_API_KEY.'),
        { status: 500 }
      );
    }

    console.log('Starting action plan generation...');

    const prompt = buildActionPlanPrompt({
      height: stats.height,
      weight: stats.weight,
      age: stats.age,
      activityLevel: stats.activityLevel,
      goal,
      targetAreas,
    });

    console.log('Calling Gemini API...');
    const model = getTextModel();
    
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (apiError) {
      console.error('Gemini API call failed:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
        return NextResponse.json(
          error(ErrorCodes.SERVER_ERROR, 'Invalid API key. Please check your GEMINI_API_KEY configuration.'),
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate') || errorMessage.includes('429')) {
        return NextResponse.json(
          error(ErrorCodes.RATE_LIMITED, 'API rate limit reached. Please wait a minute and try again.'),
          { status: 429 }
        );
      }

      return NextResponse.json(
        error(ErrorCodes.SERVER_ERROR, `AI service error: ${errorMessage}`),
        { status: 500 }
      );
    }
    
    const response = await result.response;
    const text = response.text();
    console.log('Received response from Gemini, length:', text.length);

    let planData: ActionPlan;
    try {
      const rawData = extractJSON<AIActionPlanResponse>(text);
      
      // Map to ActionPlan type
      const nutrition: MacroTargets = {
        calories: rawData.nutrition?.calories ?? 2000,
        protein: rawData.nutrition?.protein ?? 150,
        carbs: rawData.nutrition?.carbs ?? 200,
        fats: rawData.nutrition?.fats ?? 65,
        fiber: rawData.nutrition?.fiber ?? 30,
      };

      const days: WorkoutDay[] = (rawData.workout?.days ?? []).map(day => ({
        name: day.name ?? 'Workout Day',
        focus: day.focus ?? 'Full Body',
        exercises: (day.exercises ?? []).map((ex): Exercise => ({
          name: ex.name ?? 'Exercise',
          sets: ex.sets ?? 3,
          reps: ex.reps ?? '8-12',
          notes: ex.notes,
        })),
      }));

      const workout: WorkoutPlan = {
        split: rawData.workout?.split ?? 'Full Body',
        daysPerWeek: rawData.workout?.daysPerWeek ?? 3,
        emphasis: rawData.workout?.emphasis ?? [],
        days,
        notes: rawData.workout?.notes ?? [],
      };

      planData = {
        nutrition,
        workout,
        priorityAreas: rawData.priorityAreas ?? targetAreas ?? [],
        timeline: rawData.timeline ?? '8-12 weeks',
      };
    } catch (parseError) {
      console.error('Failed to parse action plan:', parseError);
      console.error('Raw response:', text.substring(0, 500));
      return NextResponse.json(
        error(ErrorCodes.GENERATION_FAILED, 'Failed to generate action plan. Please try again.'),
        { status: 500 }
      );
    }

    console.log('Action plan generated!');
    return NextResponse.json(success(planData));

  } catch (err) {
    console.error('Action plan error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      error(ErrorCodes.SERVER_ERROR, `Failed to generate action plan: ${errorMessage}`),
      { status: 500 }
    );
  }
}
