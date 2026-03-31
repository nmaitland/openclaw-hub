import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { config } from 'dotenv';

config({ override: false });

if (!process.env.HUB_URL) {
  throw new Error('HUB_URL must be set (e.g. https://your-instance.onrender.com)');
}
export const HUB_URL = process.env.HUB_URL;
export const HUB_TOKEN_FILE = path.join(os.homedir(), '.swissclaw-token');
export const HUB_REFRESH_TOKEN_FILE = path.join(os.homedir(), '.swissclaw-refresh-token');
const HUB_TOKEN_LOCK_FILE = `${HUB_TOKEN_FILE}.lock`;
const LOCK_TIMEOUT_MS = 30_000;
const LOCK_STALE_MS = 120_000;

interface LoginResponse {
  token?: string;
  refreshToken?: string;
  success?: boolean;
  error?: string;
}

interface RefreshResponse {
  token?: string;
  refreshToken?: string;
  error?: string;
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const tryAcquireLock = (): number | null => {
  try {
    return fs.openSync(HUB_TOKEN_LOCK_FILE, 'wx');
  } catch {
    return null;
  }
};

const isLockStale = (): boolean => {
  try {
    const stat = fs.statSync(HUB_TOKEN_LOCK_FILE);
    return Date.now() - stat.mtimeMs > LOCK_STALE_MS;
  } catch {
    return false;
  }
};

const releaseLock = (fd: number | null): void => {
  if (fd === null) return;
  try {
    fs.closeSync(fd);
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(HUB_TOKEN_LOCK_FILE);
  } catch {
    // ignore
  }
};

const withTokenLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const started = Date.now();
  let fd: number | null = null;

  while (fd === null) {
    fd = tryAcquireLock();
    if (fd !== null) break;

    if (isLockStale()) {
      try {
        fs.unlinkSync(HUB_TOKEN_LOCK_FILE);
      } catch {
        // ignore and continue waiting
      }
      continue;
    }

    if (Date.now() - started > LOCK_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for auth lock (${LOCK_TIMEOUT_MS}ms)`);
    }
    await sleep(250);
  }

  try {
    return await fn();
  } finally {
    releaseLock(fd);
  }
};

export const loadHubToken = (): string | null => {
  try {
    if (fs.existsSync(HUB_TOKEN_FILE)) {
      return fs.readFileSync(HUB_TOKEN_FILE, 'utf-8').trim() || null;
    }
  } catch {
    // ignore
  }
  return null;
};

export const saveHubToken = (token: string): void => {
  fs.writeFileSync(HUB_TOKEN_FILE, token, { mode: 0o600 });
};

export const clearHubToken = (): void => {
  try {
    if (fs.existsSync(HUB_TOKEN_FILE)) {
      fs.unlinkSync(HUB_TOKEN_FILE);
    }
  } catch {
    // ignore
  }
};

export const loadRefreshToken = (): string | null => {
  if (process.env.HUB_REFRESH_TOKEN && process.env.HUB_REFRESH_TOKEN.trim()) {
    return process.env.HUB_REFRESH_TOKEN.trim();
  }

  try {
    if (fs.existsSync(HUB_REFRESH_TOKEN_FILE)) {
      return fs.readFileSync(HUB_REFRESH_TOKEN_FILE, 'utf-8').trim() || null;
    }
  } catch {
    // ignore
  }
  return null;
};

export const saveRefreshToken = (token: string): void => {
  fs.writeFileSync(HUB_REFRESH_TOKEN_FILE, token, { mode: 0o600 });
};

export const clearRefreshToken = (): void => {
  try {
    if (fs.existsSync(HUB_REFRESH_TOKEN_FILE)) {
      fs.unlinkSync(HUB_REFRESH_TOKEN_FILE);
    }
  } catch {
    // ignore
  }
};

export const validateHubToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${HUB_URL}/api/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.status === 200;
  } catch {
    return false;
  }
};

// Exchange a refresh token for a new session token + rotated refresh token.
// Returns the new access token, or null if the refresh token is invalid.
export const refreshHubTokens = async (refreshToken: string): Promise<string | null> => {
  try {
    const response = await fetch(`${HUB_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as RefreshResponse;
    if (!data.token || !data.refreshToken) return null;

    saveHubToken(data.token);
    saveRefreshToken(data.refreshToken);
    return data.token;
  } catch {
    return null;
  }
};

export const loginToHub = async (): Promise<string> => {
  const username = process.env.HUB_USERNAME;
  const password = process.env.HUB_PASSWORD;
  if (!username || !password) {
    throw new Error('HUB_USERNAME and HUB_PASSWORD must be set for login');
  }

  const response = await fetch(`${HUB_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = (await response.json()) as LoginResponse;
  if (!response.ok || !data.token) {
    throw new Error(`Hub login failed: ${data.error || `HTTP ${response.status}`}`);
  }

  saveHubToken(data.token);
  if (data.refreshToken) {
    saveRefreshToken(data.refreshToken);
  }
  return data.token;
};

export const ensureHubAuth = async (skipCachedToken: boolean = false): Promise<string> => {
  return withTokenLock(async () => {
    // Try cached access token first (unless skipping due to a 401)
    if (!skipCachedToken) {
      const token = loadHubToken();
      if (token && await validateHubToken(token)) {
        return token;
      }
      if (token) clearHubToken();
    }

    // Try refresh token before full login
    const refreshToken = loadRefreshToken();
    if (refreshToken) {
      const newToken = await refreshHubTokens(refreshToken);
      if (newToken) return newToken;
      // Refresh token was invalid — clear it and fall through to full login
      clearRefreshToken();
    }

    // Full login with credentials
    return loginToHub();
  });
};
