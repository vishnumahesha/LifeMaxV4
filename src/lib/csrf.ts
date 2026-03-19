/**
 * CSRF Protection for POST/PUT/PATCH/DELETE requests
 * Uses double-submit cookie pattern
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Validate CSRF token from request
 * Returns true if valid, false otherwise
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!headerToken) {
    console.warn('CSRF validation failed: No token in header');
    return false;
  }

  // Get token from cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    console.warn('CSRF validation failed: No token in cookie');
    return false;
  }

  // Compare tokens
  if (headerToken !== cookieToken) {
    console.warn('CSRF validation failed: Token mismatch');
    return false;
  }

  return true;
}

/**
 * Get current CSRF token or generate new one
 */
export async function getOrCreateCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existingToken) {
    return existingToken;
  }

  const newToken = generateCSRFToken();
  await setCSRFCookie(newToken);
  return newToken;
}
