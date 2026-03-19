/**
 * Vitest setup file
 * Runs before all tests
 */

import { beforeAll, afterEach } from 'vitest';

// Set test environment variables
beforeAll(() => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

// Clear all mocks after each test
afterEach(() => {
  // Vitest's vi.clearAllMocks() will be called by individual tests
});
