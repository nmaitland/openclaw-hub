/**
 * Centralised fetch wrapper with automatic token refresh on 401.
 *
 * Auth and refresh tokens are stored in httpOnly cookies (set by
 * the server). The browser sends them automatically on same-origin
 * requests. For CSRF protection, the server also sets a non-httpOnly
 * `hub_csrf` cookie which we read and send as the X-CSRF-Token header
 * on mutating requests.
 */

const API_URL = process.env.REACT_APP_API_URL || '';

// ─── CSRF helper ────────────────────────────────────────────────────────

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Auth state (cookie-based) ──────────────────────────────────────────

/** Returns true if the auth cookie exists (not its value, which is httpOnly). */
export function isAuthenticated(): boolean {
  // The auth cookie is httpOnly so JS can't read it directly.
  // We use the CSRF cookie as a proxy: it's set at the same time as
  // the auth cookie and has the same lifetime.
  return getCsrfToken() !== null;
}

/** Clear cookies by calling the logout endpoint, then redirect. */
export function clearTokens(): void {
  // Cookies are cleared server-side on logout; for client-side cleanup
  // we expire the CSRF cookie (the only one JS can see).
  document.cookie = 'hub_csrf=; path=/; max-age=0';
  // Also clear legacy localStorage tokens if they exist (migration cleanup)
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
}

// ─── Token refresh ──────────────────────────────────────────────────────

// Coalesce concurrent refresh attempts into a single request.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    return res.ok;
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Authenticated fetch ────────────────────────────────────────────────

function redirectToLogin(): never {
  clearTokens();
  window.location.assign('/login');
  throw new Error('Redirecting to login');
}

/**
 * Drop-in replacement for `fetch()` that includes credentials (cookies)
 * and the CSRF header, and retries once on 401 after refreshing the token.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const doFetch = () => {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {}),
    };

    // Add CSRF header for mutating requests
    const method = (init.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const csrf = getCsrfToken();
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }
    }

    return fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    }
    if (res.status === 401) {
      redirectToLogin();
    }
  }

  return res;
}
