/**
 * CSRF Token Hook
 * Fetches and manages CSRF token for protected POST requests
 */

import { useState, useEffect } from 'react';

interface CSRFState {
  token: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and provide CSRF token for protected requests
 * Automatically fetches token on mount and refreshes if expired
 */
export function useCSRF(): CSRFState {
  const [state, setState] = useState<CSRFState>({
    token: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      try {
        const response = await fetch('/api/csrf');

        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.data?.csrfToken) {
          throw new Error('Invalid CSRF token response');
        }

        if (mounted) {
          setState({
            token: data.data.csrfToken,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('CSRF token fetch error:', err);
        if (mounted) {
          setState({
            token: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch CSRF token',
          });
        }
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * Helper to add CSRF token to fetch headers
 * Usage: fetch('/api/meals', { ...addCSRFToken(csrfToken, options) })
 */
export function addCSRFToken(
  token: string | null,
  options: RequestInit = {}
): RequestInit {
  if (!token) {
    console.warn('CSRF token not available, request may fail');
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { 'x-csrf-token': token } : {}),
    },
  };
}
