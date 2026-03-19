# LifeMAX Security & Performance Audit Report

Generated: 2026-03-17

## ✅ COMPLETED FIXES

### 1. CSRF Protection Added
- **Files Modified**:
  - Created `/src/lib/csrf.ts` - CSRF token validation utilities
  - Created `/src/app/api/csrf/route.ts` - GET endpoint to fetch CSRF tokens
  - Modified `/src/app/api/meals/route.ts` - Added CSRF validation to POST
  - Modified `/src/app/api/foods/custom/route.ts` - Added CSRF validation to POST

- **Implementation**: Double-submit cookie pattern with httpOnly cookies
- **Protected Routes**: All database-writing POST operations (meals, custom foods)
- **Client Integration Required**: Frontend must fetch CSRF token from `/api/csrf` and include in `x-csrf-token` header for POST requests

### 2. Image Optimization Fixed
- **Files Modified**:
  - `/src/app/tracker/add/photo/PhotoMealScanner.tsx` - Replaced 2 `<img>` tags
  - `/src/app/face/preview/BestVersionContent.tsx` - Replaced 3 `<img>` tags
  - `/src/app/body/preview/BodyPreviewContent.tsx` - Replaced 4 `<img>` tags

- **Changes**: All `<img>` tags replaced with Next.js `<Image>` components using `fill` prop and `unoptimized` for data URLs
- **Performance Impact**: Fixes full-size image serving issue, proper responsive handling

---

## ⚠️ INCOMPLETE/BROKEN FEATURES

### 1. Back Photo Analysis - NOT IMPLEMENTED
**Location**: `/src/app/api/body/scan/route.ts:89`

```typescript
const hasBackPhoto = false; // Not implemented yet
```

**Impact**:
- Body scan endpoint accepts `backPhotoBase64` parameter but ignores it
- UI may allow users to upload back photos that are never processed
- Misleading to users who think back analysis is available

**Recommended Action**:
- Either implement back photo analysis OR
- Remove `backPhotoBase64` from request schema and UI upload options
- Update documentation to clarify front + side only

**Test Manually**:
1. Go to body analyzer
2. Try uploading 3 photos (front, side, back)
3. Verify back photo is silently ignored in results

---

### 2. Meal Photo Upload Error Handling
**Location**: `/src/app/api/meals/photo/scan/route.ts:129`

```typescript
throw new Error('Failed to upload photo');
```

**Impact**:
- Photo upload failures throw generic error without retry guidance
- User loses scan progress if upload fails after AI processing completes
- No fallback to keep data locally if storage upload fails

**Recommended Action**:
- Wrap upload in try/catch and fall back to data URL if storage fails
- Show specific error message to user ("Storage issue, saved locally")
- Consider retry logic with exponential backoff

**Test Manually**:
1. Disconnect from internet after photo scan completes
2. Try to save meal
3. Verify graceful degradation vs. hard error

---

### 3. Array Bounds Validation - FIXED BUT RISKY
**Locations**:
- `/src/app/api/face/scan/route.ts:308`
- `/src/app/api/body/scan/route.ts:305`

**Status**: Fixed with validation, but indicates AI instability

**Impact**:
- Gemini may occasionally return < 3 top levers
- Now throws validation error (good) but user sees "Analysis failed"
- Root cause is unpredictable AI responses

**Recommended Action**:
- Add fallback lever generation if AI returns < 3
- Log occurrences to monitor AI quality
- Consider prompt tuning to enforce 3+ levers

**Test Manually**:
- Monitor production logs for "Expected at least 3 top levers" errors
- If frequent (>5%), investigate prompt engineering

---

### 4. Rate Limit Error Messages - INCONSISTENT
**Locations**:
- `/src/app/face/preview/BestVersionContent.tsx:458`
- Various preview components

**Issue**: Different user-facing messages for same rate limit scenario

**Examples**:
- "Rate limit reached. Please wait 1-2 minutes"
- "Please wait and try again"
- "API rate limit reached. Please wait a minute"

**Recommended Action**:
- Centralize error message constants in `/src/lib/error-messages.ts`
- Use consistent wording: "Rate limit reached. Try again in X seconds."
- Display actual retry-after time from response headers

---

### 5. CSRF Token Not Wired to Frontend
**Status**: Backend ready, frontend integration missing

**Required Changes**:
1. Create hook: `/src/lib/hooks/useCSRFToken.ts`
   ```typescript
   export function useCSRFToken() {
     const [token, setToken] = useState<string | null>(null);
     useEffect(() => {
       fetch('/api/csrf').then(r => r.json()).then(d => setToken(d.data.csrfToken));
     }, []);
     return token;
   }
   ```

2. Update all POST requests to include header:
   ```typescript
   headers: { 'x-csrf-token': csrfToken }
   ```

3. Files needing updates:
   - `/src/app/tracker/add/photo/PhotoMealScanner.tsx` (meal saving)
   - `/src/app/tracker/add/quick/page.tsx` (quick add)
   - `/src/app/foods/custom/` (custom food creation)

**Test Manually**:
1. Try to create meal without CSRF token
2. Should get 403 Forbidden
3. Add token, should succeed

---

### 6. Missing Error Boundary
**Impact**: Component errors crash entire app instead of showing fallback UI

**Recommended Action**:
- Add React Error Boundary at app level
- Create `/src/components/ErrorBoundary.tsx`
- Wrap main content in layout.tsx

---

## 🔍 RECOMMENDED MANUAL TESTS

### Critical Paths to Test:

1. **Face Analysis Flow**
   - Upload photo with poor quality (< 0.3 score)
   - Verify rejection with helpful message
   - Upload valid photo, verify cache hit on retry

2. **Body Analysis Flow**
   - Upload only front photo (side optional)
   - Verify results don't mention back photo analysis
   - Check posture scores only with side photo present

3. **Meal Tracking Flow**
   - Scan meal photo
   - Try to save without CSRF token (should fail after frontend update)
   - Verify pagination works (add 50+ meals, check next page)

4. **Rate Limiting**
   - Make 10+ requests to `/api/face/scan` rapidly
   - 11th request should get 429 with Retry-After header
   - Wait 60 seconds, verify limit resets

5. **Image Loading**
   - Check all pages with Next.js Image components
   - Verify no layout shift, proper aspect ratios
   - Test on slow connection (throttle to 3G)

---

## 📊 PERFORMANCE METRICS TO MONITOR

After deployment, track:
- CSRF validation failures (should be near 0 after frontend update)
- Rate limit 429 responses (indicates abuse or UX issue if high)
- Array bounds errors in logs (AI quality indicator)
- Image load times (should improve with Next.js Image)

---

## 🚨 BREAKING CHANGES FOR FRONTEND

**Required Frontend Updates:**
1. Add CSRF token fetching and header inclusion
2. Handle 403 responses for missing CSRF
3. Update error messages to use centralized constants
4. Remove UI for back photo upload in body analyzer

**Timeline**: Complete before production deploy
