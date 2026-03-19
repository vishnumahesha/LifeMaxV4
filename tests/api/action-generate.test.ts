/**
 * Unit tests for /api/action/generate - Action Plan Generation Route
 * Tests validation, rate limiting, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/action/generate/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/gemini', () => ({
  getTextModel: vi.fn(),
  extractJSON: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 9, reset: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

describe('POST /api/action/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('Request Validation', () => {
    it('should reject request missing stats', async () => {
      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({ goal: 'build_muscle' }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.data.errors.stats).toBeDefined();
    });

    it('should reject request missing goal', async () => {
      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.data.errors.goal).toBeDefined();
    });

    it('should accept valid minimal request', async () => {
      const { getTextModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getTextModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              nutrition: { calories: 2500, protein: 150, carbs: 300, fats: 70, fiber: 30 },
              workout: {
                split: 'Upper/Lower',
                daysPerWeek: 4,
                emphasis: ['Compound lifts'],
                days: [
                  {
                    name: 'Upper A',
                    focus: 'Push',
                    exercises: [
                      { name: 'Bench Press', sets: 4, reps: '8-10', notes: 'Compound' },
                    ],
                  },
                ],
                notes: ['Progressive overload'],
              },
              priorityAreas: ['Chest', 'Shoulders'],
              timeline: '12 weeks',
            }),
          },
        }),
      } as any);

      vi.mocked(extractJSON).mockReturnValue({
        nutrition: { calories: 2500, protein: 150, carbs: 300, fats: 70, fiber: 30 },
        workout: {
          split: 'Upper/Lower',
          daysPerWeek: 4,
          emphasis: ['Compound lifts'],
          days: [
            {
              name: 'Upper A',
              focus: 'Push',
              exercises: [{ name: 'Bench Press', sets: 4, reps: '8-10' }],
            },
          ],
          notes: ['Progressive overload'],
        },
        priorityAreas: ['Chest'],
        timeline: '12 weeks',
      } as any);

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
          goal: 'build_muscle',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.nutrition).toBeDefined();
      expect(body.data.workout).toBeDefined();
    });

    it('should accept optional fields (age, activityLevel, targetAreas)', async () => {
      const { getTextModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getTextModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => '{}' },
        }),
      } as any);

      vi.mocked(extractJSON).mockReturnValue({
        nutrition: { calories: 2200, protein: 140, carbs: 250, fats: 60, fiber: 25 },
        workout: {
          split: 'PPL',
          daysPerWeek: 6,
          emphasis: ['Legs'],
          days: [],
          notes: [],
        },
        priorityAreas: ['Legs', 'Glutes'],
        timeline: '16 weeks',
      } as any);

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: {
            height: '165cm',
            weight: '60kg',
            age: 28,
            activityLevel: 'moderate',
          },
          goal: 'get_leaner',
          targetAreas: ['legs', 'core'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on action plan generation', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');

      vi.mocked(checkRateLimit).mockReturnValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '175cm', weight: '70kg' },
          goal: 'recomp',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.code).toBe('RATE_LIMITED');
    });

    it('should track rate limit per client IP', async () => {
      const { getClientIP } = await import('@/lib/rate-limit');

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '175cm', weight: '70kg' },
          goal: 'maintain',
        }),
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });

      await POST(request).catch(() => {}); // May fail without full mock

      expect(getClientIP).toHaveBeenCalledWith(request);
    });
  });

  describe('API Key Validation', () => {
    it('should fail when GEMINI_API_KEY not set', async () => {
      delete process.env.GEMINI_API_KEY;

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
          goal: 'build_muscle',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('SERVER_ERROR');
      expect(body.message).toContain('GEMINI_API_KEY');
    });
  });

  describe('Error Handling', () => {
    it('should handle Gemini API failures gracefully', async () => {
      const { getTextModel } = await import('@/lib/gemini');

      vi.mocked(getTextModel).mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(new Error('API key invalid')),
      } as any);

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
          goal: 'build_muscle',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('SERVER_ERROR');
    });

    it('should handle rate limit errors from Gemini', async () => {
      const { getTextModel } = await import('@/lib/gemini');

      vi.mocked(getTextModel).mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(new Error('429 rate limit exceeded')),
      } as any);

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
          goal: 'build_muscle',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.code).toBe('RATE_LIMITED');
    });

    it('should handle malformed AI response', async () => {
      const { getTextModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getTextModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => 'not valid json' },
        }),
      } as any);

      vi.mocked(extractJSON).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
          goal: 'build_muscle',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('GENERATION_FAILED');
    });
  });

  describe('Response Structure', () => {
    it('should provide default values for missing nutrition fields', async () => {
      const { getTextModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getTextModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => '{}' },
        }),
      } as any);

      // Simulate partial response from AI
      vi.mocked(extractJSON).mockReturnValue({
        nutrition: { calories: 2000 }, // Missing protein, carbs, fats, fiber
        workout: { split: 'Test', daysPerWeek: 3, emphasis: [], days: [], notes: [] },
      } as any);

      const request = new NextRequest('http://localhost/api/action/generate', {
        method: 'POST',
        body: JSON.stringify({
          stats: { height: '180cm', weight: '75kg' },
          goal: 'maintain',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.nutrition.calories).toBe(2000);
      expect(body.data.nutrition.protein).toBeDefined();
      expect(body.data.nutrition.carbs).toBeDefined();
    });
  });
});
