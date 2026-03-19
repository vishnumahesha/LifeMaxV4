# LifeMAX Test Suite

## Overview

Unit tests for the 3 most critical API routes that make expensive AI calls:
- `/api/face/scan` - Face analysis with Gemini Vision
- `/api/body/scan` - Body analysis with Gemini Vision
- `/api/action/generate` - Action plan generation with Gemini Text

## Running Tests

```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run specific test file
npx vitest tests/api/face-scan.test.ts
```

## Test Coverage

### Face Scan Tests (`face-scan.test.ts`)
- ✅ Request validation (missing/empty base64)
- ✅ Rate limiting enforcement
- ✅ Cache hit/miss behavior
- ✅ API key validation
- ✅ Error handling (malformed JSON, API failures)
- ✅ **Array bounds bug fix** (topLevers < 3 elements)

### Body Scan Tests (`body-scan.test.ts`)
- ✅ Request validation (required/optional fields)
- ✅ Rate limiting per IP
- ✅ Caching determinism
- ✅ Photo quality rejection (< 0.3 threshold)
- ✅ **Array bounds bug fix** (topLevers validation)
- ✅ API configuration errors

### Action Plan Tests (`action-generate.test.ts`)
- ✅ Request validation (stats, goal, optional fields)
- ✅ Rate limiting enforcement
- ✅ API key validation
- ✅ Gemini API error handling (rate limits, failures)
- ✅ Malformed AI response handling
- ✅ Default value fallbacks for partial responses

## Key Test Scenarios

### Rate Limiting
All 3 routes enforce 10 requests/minute per IP with proper 429 responses and Retry-After headers.

### Critical Bug Coverage
Tests specifically verify the array bounds bug fix where AI could return < 3 top levers, causing a runtime crash. Now properly throws validation error.

### API Failures
Tests cover:
- Missing API keys (500 Server Error)
- Rate limit from Gemini (429 with retry guidance)
- Invalid API keys (500 with clear message)
- Network failures (graceful degradation)

## Mocking Strategy

- **Gemini API**: Fully mocked to avoid real API calls and costs
- **Rate Limiter**: Mocked to control test outcomes
- **Caching**: Mocked to test hit/miss scenarios independently
- **Environment**: Test env vars set in `tests/setup.ts`

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Coverage Goals

- **Current**: Core validation, rate limiting, error handling
- **Target**: 80%+ coverage on API routes
- **Future**: Integration tests with real Supabase + Gemini staging

## Writing New Tests

Follow the existing pattern:
1. Mock all external dependencies
2. Test happy path + edge cases
3. Verify error codes and HTTP status
4. Check rate limiting enforcement
5. Validate response structure

Example:
```typescript
it('should validate request schema', async () => {
  const request = new NextRequest('http://localhost/api/route', {
    method: 'POST',
    body: JSON.stringify({ invalid: 'data' }),
  });

  const response = await POST(request);
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.code).toBe('VALIDATION_ERROR');
});
```
