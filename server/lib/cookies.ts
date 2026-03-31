import { Response, CookieOptions } from 'express';
import { randomBytes } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie names
export const AUTH_COOKIE = 'hub_auth';
export const REFRESH_COOKIE = 'hub_refresh';
export const CSRF_COOKIE = 'hub_csrf';

// Shared options for auth cookies (httpOnly, not readable by JS)
const secureCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
};

/**
 * Set auth + refresh + CSRF cookies on a response.
 * Called after successful login or token refresh.
 */
export function setAuthCookies(
  res: Response,
  authToken: string,
  refreshToken: string,
): void {
  // Session token - 24h, httpOnly
  res.cookie(AUTH_COOKIE, authToken, {
    ...secureCookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Refresh token - 30 days, httpOnly
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...secureCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // CSRF token - NOT httpOnly so JS can read it and send as header.
  // Value is random and tied to nothing server-side; the double-submit
  // pattern just verifies cookie === header, proving same origin.
  const csrfToken = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

/**
 * Clear all auth cookies (on logout).
 */
export function clearAuthCookies(res: Response): void {
  const clearOptions: CookieOptions = { path: '/' };
  res.clearCookie(AUTH_COOKIE, clearOptions);
  res.clearCookie(REFRESH_COOKIE, clearOptions);
  res.clearCookie(CSRF_COOKIE, clearOptions);
}
