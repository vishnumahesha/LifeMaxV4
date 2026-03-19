/**
 * Unit tests for /api/face/scan - Face Analysis Route
 * Tests validation, rate limiting, caching, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/face/scan/route';
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
  computeImageHash: vi.fn(() => 'testhash123'),
  getSeedFromHash: vi.fn(() => 12345),
  getCachedResult: vi.fn(() => null),
  setCachedResult: vi.fn(),
  CONFIDENCE_THRESHOLDS: { allowExtremes: 0.7 },
}));

const VALID_BASE64_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

describe('POST /api/face/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('Request Validation', () => {
    it('should reject missing frontPhotoBase64', async () => {
      const request = new NextRequest('http://localhost/api/face/scan', {
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
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const { getCachedResult } = await import('@/lib/scoring');

      vi.mocked(checkRateLimit).mockReturnValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
      vi.mocked(getCachedResult).mockReturnValue({
        photoQuality: { score: 0.8, issues: [] },
        overall: { currentScore10: 7.5, potentialRange: { min: 7.5, max: 8.5 }, confidence: 0.85, summary: 'Test' },
        topLevers: [
          { name: 'Skin', deltaRange: { min: 0.3, max: 0.5 }, timeline: '2-4 weeks', explanation: 'Test', steps: [] },
          { name: 'Hair', deltaRange: { min: 0.2, max: 0.4 }, timeline: '4-8 weeks', explanation: 'Test', steps: [] },
          { name: 'Grooming', deltaRange: { min: 0.1, max: 0.3 }, timeline: '1-2 weeks', explanation: 'Test', steps: [] },
        ],
      } as any);

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should reject request with empty base64 string', async () => {
      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: '' }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should reject when rate limit exceeded', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');

      vi.mocked(checkRateLimit).mockReturnValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
      });

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.code).toBe('RATE_LIMITED');
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });

    it('should extract client IP from headers', async () => {
      const { getClientIP } = await import('@/lib/rate-limit');
      const { getCachedResult } = await import('@/lib/scoring');

      vi.mocked(getCachedResult).mockReturnValue({} as any);

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      await POST(request);

      expect(getClientIP).toHaveBeenCalledWith(request);
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const { getCachedResult } = await import('@/lib/scoring');

      const cachedResult = {
        photoQuality: { score: 0.9, issues: [] },
        overall: { currentScore10: 8.0, potentialRange: { min: 8.0, max: 9.0 }, confidence: 0.9, summary: 'Cached' },
        topLevers: [
          { name: 'Test1', deltaRange: { min: 0, max: 1 }, timeline: '1w', explanation: 'E1', steps: [] },
          { name: 'Test2', deltaRange: { min: 0, max: 1 }, timeline: '2w', explanation: 'E2', steps: [] },
          { name: 'Test3', deltaRange: { min: 0, max: 1 }, timeline: '3w', explanation: 'E3', steps: [] },
        ],
      };

      vi.mocked(getCachedResult).mockReturnValue(cachedResult as any);

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(cachedResult);
    });

    it('should compute deterministic hash for same image', async () => {
      const { computeImageHash, getCachedResult } = await import('@/lib/scoring');

      vi.mocked(getCachedResult).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
      });

      await POST(request).catch(() => {}); // May fail without full Gemini mock

      expect(computeImageHash).toHaveBeenCalledWith(VALID_BASE64_IMAGE);
    });
  });

  describe('API Key Validation', () => {
    it('should reject when GEMINI_API_KEY not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      const { getCachedResult } = await import('@/lib/scoring');
      vi.mocked(getCachedResult).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('SERVER_ERROR');
      expect(body.message).toContain('GEMINI_API_KEY');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: 'not-valid-json',
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate array bounds for topLevers', async () => {
      // This tests the bug fix - ensuring topLevers has 3 elements
      const { getCachedResult } = await import('@/lib/scoring');
      const { getVisionModel, extractJSON } = await import('@/lib/gemini');

      vi.mocked(getCachedResult).mockReturnValue(null);
      vi.mocked(getVisionModel).mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              photoQuality: { score: 0.8, issues: [] },
              overall: { currentScore10: 7, potentialRange: { min: 7, max: 8 }, confidence: 0.8, summary: 'Test' },
              topLevers: [{ name: 'Only One', deltaRange: { min: 0, max: 1 }, timeline: '1w', explanation: 'Test', steps: [] }], // Only 1 lever!
            }),
          },
        }),
      } as any);

      vi.mocked(extractJSON).mockReturnValue({
        photoQuality: { score: 0.8, issues: [] },
        overall: { currentScore10: 7, potentialRange: { min: 7, max: 8 }, confidence: 0.8, summary: 'Test' },
        topLevers: [{ name: 'Only One', deltaRange: { min: 0, max: 1 }, timeline: '1w', explanation: 'Test', steps: [] }],
      } as any);

      const request = new NextRequest('http://localhost/api/face/scan', {
        method: 'POST',
        body: JSON.stringify({ frontPhotoBase64: VALID_BASE64_IMAGE }),
      });

      const response = await POST(request);
      const body = await response.json();

      // Should fail because topLevers has < 3 elements
      expect(response.status).toBe(500);
      expect(body.code).toBe('ANALYSIS_FAILED');
    });
  });
});
