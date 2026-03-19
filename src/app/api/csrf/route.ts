/**
 * CSRF Token Endpoint
 * Returns a CSRF token for the client to use in POST requests
 */

import { NextResponse } from 'next/server';
import { getOrCreateCSRFToken } from '@/lib/csrf';

export async function GET() {
  try {
    const token = await getOrCreateCSRFToken();

    return NextResponse.json({
      success: true,
      data: { csrfToken: token },
    });
  } catch (err) {
    console.error('CSRF token generation error:', err);
    return NextResponse.json(
      {
        success: false,
        code: 'SERVER_ERROR',
        message: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
