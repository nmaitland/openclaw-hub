/**
 * Centralised fetch wrapper with automatic token refresh on 401.
 *
 * Stores authToken + refreshToken in localStorage.
 * On 401: silently exchanges the refresh token for a new session,
 * then retries the original request once. If refresh fails,
 * clears tokens and redirects to /login.
 */

const API_URL = process.env.REACT_APP_API_URL || '';

// ─── Token helpers ───────────────────────────────────────────────────────

export const getAuthToken = (): string | null =>
  localStorage.getItem('authToken');

export const getRefreshToken = (): string | null =>
  localStorage.getItem('refreshToken');

export const setTokens = (authToken: string, refreshToken?: string): void => {
  localStorage.setItem('authToken', authToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const clearTokens = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
};

// ─── Token refresh ───────────────────────────────────────────────────────

// Coalesce concurrent refresh attempts into a single request.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.token && data.refreshToken) {
      setTokens(data.token, data.refreshToken);
      return true;
    }
    return false;
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

// ─── Authenticated fetch ─────────────────────────────────────────────────

function redirectToLogin(): never {
  clearTokens();
  window.location.assign('/login');
  // Never resolves; prevents callers from continuing.
  throw new Error('Redirecting to login');
}

/**
 * Drop-in replacement for `fetch()` that adds the auth header and
 * retries once on 401 after refreshing the token.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const doFetch = (token: string | null) => {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };

  let res = await doFetch(getAuthToken());

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch(getAuthToken());
    }
    if (res.status === 401) {
      redirectToLogin();
    }
  }

  return res;
}
