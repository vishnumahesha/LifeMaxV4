/**
 * Unit tests for /api/body/scan - Body Analysis Route
 * Tests validation, rate limiting, caching, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/body/scan/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/gemini', () => ({
  getVisionModel: vi.fn(),
  base64ToGenerativePart: vi.fn(),
  extractJSON: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 9, reset: Date.now() + 60000 })),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/scoring', () => ({
  computeImageHash: vi.fn(() => 'bodyhash456'),
  getCachedResult: vi.fn(() => null),
  setCachedResult: vi.fn(),
  CONFIDENCE_THRESHOLDS: { allowExtremes: 0.7 },
}));

const VALID_BODY_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

describe('POST /api/body/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('Request Validation', () => {
    it('should reject missing frontPhotoBase64', async () => {
      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should accept valid request with front photo only', async () => {
      const { getCachedResult } = await import('@/lib/scoring');

      vi.mocked(getCachedResult).mockReturnValue({
        photoQuality: { score: 0.8, issues: [] },
        overall: { currentScore10: 6.5, potentialRange: { min: 6.5, max: 7.5 }, confidence: 0.8, summary: 'Test' },
        topLevers: [
          { name: 'Posture', deltaRange: { min: 0.4, max: 0.6 }, timeline: '8-12 weeks', explanation: 'Test', steps: [] },
          { name: 'Leanness', deltaRange: { min: 0.3, max: 0.5 }, timeline: '12-16 weeks', explanation: 'Test', steps: [] },
          { name: 'Muscle', deltaRange: { min: 0.2, max: 0.4 }, timeline: '16-24 weeks', explanation: 'Test', steps: [] },
        ],
      } as any);

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BODY_IMAGE }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should accept optional side and back photos', async () => {
      const { getCachedResult } = await import('@/lib/scoring');

      vi.mocked(getCachedResult).mockReturnValue({
        photoQuality: { score: 0.9, issues: [] },
        overall: { currentScore10: 7, potentialRange: { min: 7, max: 8 }, confidence: 0.9, summary: 'Test' },
        topLevers: [
          { name: 'T1', deltaRange: { min: 0, max: 1 }, timeline: '1w', explanation: 'E', steps: [] },
          { name: 'T2', deltaRange: { min: 0, max: 1 }, timeline: '2w', explanation: 'E', steps: [] },
          { name: 'T3', deltaRange: { min: 0, max: 1 }, timeline: '3w', explanation: 'E', steps: [] },
        ],
      } as any);

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({
          frontPhotoBase64: VALID_BODY_IMAGE,
          sidePhotoBase64: VALID_BODY_IMAGE,
          backPhotoBase64: VALID_BODY_IMAGE,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should block requests exceeding rate limit', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');

      vi.mocked(checkRateLimit).mockReturnValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 45000,
      });

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BODY_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.code).toBe('RATE_LIMITED');
    });
  });

  describe('Caching Behavior', () => {
    it('should return cached result for same image hash', async () => {
      const { getCachedResult } = await import('@/lib/scoring');

      const cachedData = {
        photoQuality: { score: 0.85, issues: [] },
        overall: { currentScore10: 7.2, potentialRange: { min: 7.2, max: 8.2 }, confidence: 0.85, summary: 'Cached body result' },
        topLevers: [
          { name: 'Lever1', deltaRange: { min: 0.1, max: 0.3 }, timeline: '4w', explanation: 'E1', steps: [] },
          { name: 'Lever2', deltaRange: { min: 0.2, max: 0.4 }, timeline: '8w', explanation: 'E2', steps: [] },
          { name: 'Lever3', deltaRange: { min: 0.3, max: 0.5 }, timeline: '12w', explanation: 'E3', steps: [] },
        ],
      };

      vi.mocked(getCachedResult).mockReturnValue(cachedData as any);

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BODY_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(cachedData);
    });
  });

  describe('Photo Quality Rejection', () => {
    it('should reject low quality photos (score < 0.3)', async () => {
      const { getCachedResult } = await import('@/lib/scoring');
      const { getVisionModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getCachedResult).mockReturnValue(null);
      vi.mocked(getVisionModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => '{}' },
        }),
      } as any);

      vi.mocked(extractJSON).mockReturnValue({
        photoQuality: { score: 0.2, issues: ['Too blurry', 'Poor lighting'] },
        overall: { currentScore10: 5, potentialRange: { min: 5, max: 6 }, confidence: 0.5, summary: 'Low quality' },
        topLevers: [
          { name: 'T1', deltaRange: { min: 0, max: 1 }, timeline: '1w', explanation: 'E', steps: [] },
          { name: 'T2', deltaRange: { min: 0, max: 1 }, timeline: '2w', explanation: 'E', steps: [] },
          { name: 'T3', deltaRange: { min: 0, max: 1 }, timeline: '3w', explanation: 'E', steps: [] },
        ],
      } as any);

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BODY_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe('PHOTO_QUALITY_TOO_LOW');
      expect(body.data.issues).toContain('Too blurry');
    });
  });

  describe('Array Bounds Bug Fix', () => {
    it('should throw error when topLevers has fewer than 3 elements', async () => {
      const { getCachedResult } = await import('@/lib/scoring');
      const { getVisionModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getCachedResult).mockReturnValue(null);
      vi.mocked(getVisionModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => '{}' },
        }),
      } as any);

      vi.mocked(extractJSON).mockReturnValue({
        photoQuality: { score: 0.7, issues: [] },
        overall: { currentScore10: 6, potentialRange: { min: 6, max: 7 }, confidence: 0.7, summary: 'Test' },
        topLevers: [
          { name: 'Only', deltaRange: { min: 0, max: 1 }, timeline: '1w', explanation: 'Test', steps: [] },
          { name: 'Two', deltaRange: { min: 0, max: 1 }, timeline: '2w', explanation: 'Test', steps: [] },
        ], // Only 2 levers
      } as any);

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BODY_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('ANALYSIS_FAILED');
    });
  });

  describe('API Configuration', () => {
    it('should fail gracefully when GEMINI_API_KEY missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const { getCachedResult } = await import('@/lib/scoring');
      vi.mocked(getCachedResult).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/body/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BODY_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('SERVER_ERROR');
      expect(body.message).toContain('GEMINI_API_KEY');
    });
  });
});
