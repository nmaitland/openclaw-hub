# Security Review: 2026-02-25

Date: 2026-02-25
Repo: `nmaitland/swissclaw-hub`
Scope:
- Backend auth/session/security controls in `server/`
- Frontend token handling in `client/`
- Deployment and CI config
- GitHub Dependabot + Code Scanning open alerts

## Executive Summary

The codebase has good foundations (parameterized SQL, bcrypt usage, auth middleware present, Helmet, and rate limiting), but there are still several high-impact issues:

1. Insecure auth defaults/fallbacks can allow access if env config is missing.
2. Session token handling via URL query and localStorage increases token leakage and replay risk.
3. Dependency risk remains high in both root and client trees, with a concentrated problem in the `react-scripts` ecosystem.

## Findings (Prioritized)

### High

1. Insecure credential and service-token fallbacks
- `AUTH_PASSWORD` defaults to `changeme123` if unset.
- `SWISSCLAW_TOKEN` defaults to `dev-token-change-in-production` if unset.
- Files:
  - `server/index.ts:105`
  - `server/index.ts:395`
  - `server/mcp-server.ts:21`
  - `.mcp.json:8`
- Risk: deployment misconfiguration can become immediate unauthorized access.

2. Token leakage risk from URL/query token pattern
- Login flow redirects to `/?token=...`.
- API and Socket auth accept query token fallback.
- Files:
  - `server/index.ts:239`
  - `server/index.ts:125`
  - `server/index.ts:1516`
  - `client/src/App.tsx:55`
  - `client/src/App.tsx:58`
- Risk: token exposure in browser history, logs, reverse proxies, and referrers.

### Medium

3. Brute-force resistance is weak on active login endpoint
- `/api/login` is protected only by global limiter (`100/15 min/IP`).
- Strong auth limiter (`5/15 min/IP`) is only on `/auth/login`.
- Files:
  - `server/index.ts:251`
  - `server/index.ts:335`
  - `server/routes/auth.ts:51`

4. Production DB TLS allows unverified certs
- `rejectUnauthorized: false` in Sequelize production config.
- File:
  - `config/database.js:56`

5. GitHub Actions workflow lacks explicit least-privilege token permissions
- Missing root/job-level `permissions:` blocks in CI workflow.
- File:
  - `.github/workflows/ci.yml`

6. Potential sensitive logging in bridge script
- Logs username presence and password-length metadata to stderr.
- File:
  - `scripts/agent-chat-bridge.ts:172`
  - `scripts/agent-chat-bridge.ts:173`

### Low / Latent

7. CodeQL sanitizer/regex findings currently map to helper code not active request paths
- `validateInput.sanitizeHtml` and related regex rules are flagged.
- Currently not wired into runtime request handlers.
- File:
  - `server/middleware/auth.ts:128`

## GitHub Alert Snapshot (Open on 2026-02-25)

### Dependabot
- Open alerts: 11 total
- High: 7
- Medium: 4
- Key packages:
  - `tar` (multiple high alerts)
  - `minimatch` (high ReDoS)
  - `jsonpath` (high code injection in client dependency graph)
  - `webpack-dev-server`, `postcss`, `nth-check`

Reference links:
- https://github.com/nmaitland/swissclaw-hub/security/dependabot
- Example alerts:
  - https://github.com/nmaitland/swissclaw-hub/security/dependabot/15
  - https://github.com/nmaitland/swissclaw-hub/security/dependabot/20
  - https://github.com/nmaitland/swissclaw-hub/security/dependabot/6

### Code Scanning
- Open alerts: 10 total
- High-severity rules include:
  - clear-text logging (`scripts/agent-chat-bridge.ts`)
  - sanitizer/regex findings (`server/middleware/auth.ts`)
- Medium:
  - missing workflow permissions (`.github/workflows/ci.yml`)

Reference links:
- https://github.com/nmaitland/swissclaw-hub/security/code-scanning
- Example alerts:
  - https://github.com/nmaitland/swissclaw-hub/security/code-scanning/4
  - https://github.com/nmaitland/swissclaw-hub/security/code-scanning/10
  - https://github.com/nmaitland/swissclaw-hub/security/code-scanning/2

## Local Audit Confirmation

Runtime dependency checks performed:
- `npm --prefix . audit --omit=dev --json`
  - 9 vulnerabilities (6 high)
- `npm --prefix client audit --omit=dev --json`
  - 14 vulnerabilities (9 high)

Dependency path checks performed:
- `npm --prefix . ls tar minimatch --all`
- `npm --prefix client ls jsonpath webpack-dev-server nth-check postcss --all`

## Follow-Up: Potential PRs

1. Remove insecure auth/token fallbacks and fail fast in production
- Scope:
  - Enforce required env vars at startup for `AUTH_PASSWORD`, `SWISSCLAW_TOKEN`.
  - Remove fallback defaults from server and MCP server.
  - Remove hardcoded dev token from `.mcp.json` template.
- Files:
  - `server/index.ts`
  - `server/mcp-server.ts`
  - `.mcp.json`
  - `.env.example`
  - `README.md`

2. Token transport hardening
- Scope:
  - Remove `?token=` redirect pattern.
  - Stop accepting query tokens in HTTP and Socket auth.
  - Keep bearer header/socket auth payload only.
- Files:
  - `server/index.ts`
  - `client/src/App.tsx`
  - `client/src/components/KanbanBoard.tsx`

3. Login protection consolidation
- Scope:
  - Apply strict auth limiter to `/api/login` or consolidate to one login route.
  - Add lockout/slowdown strategy and better auth failure telemetry.
- Files:
  - `server/index.ts`
  - `server/routes/auth.ts`
  - `server/middleware/security.ts`

4. Enforce DB TLS verification
- Scope:
  - Remove `rejectUnauthorized: false`.
  - Add env-based CA/cert handling for managed Postgres where needed.
  - Document deployment expectations.
- Files:
  - `config/database.js`
  - `server/config/database.ts`
  - `README.md`

5. CI least-privilege permissions
- Scope:
  - Add explicit `permissions:` at workflow root.
  - Add job overrides only where write scopes are required.
- Files:
  - `.github/workflows/ci.yml`

6. Remove sensitive debug logs from bridge script
- Scope:
  - Remove credential-related debug lines.
  - Keep non-sensitive operational logs only.
- Files:
  - `scripts/agent-chat-bridge.ts`

7. Backend dependency remediation batch
- Scope:
  - Resolve `tar` and `minimatch` paths by upgrading/changing dependent packages.
  - Re-run tests and audit.
- Files:
  - `package.json`
  - `package-lock.json`

8. Frontend dependency remediation strategy
- Scope:
  - Address `react-scripts` chain vulnerabilities.
  - Option A: constrained upgrades inside CRA.
  - Option B: migrate to Vite for long-term dependency health.
- Files:
  - `client/package.json`
  - `client/package-lock.json`
  - frontend build/test config files

9. CodeQL findings cleanup
- Scope:
  - Remove or refactor unused sanitizer helper code in `server/middleware/auth.ts`.
  - If retained, replace regex-based sanitizer with vetted sanitization strategy.
- Files:
  - `server/middleware/auth.ts`
  - corresponding unit tests

10. Security middleware integration pass
- Scope:
  - Decide which existing middleware should actually be mounted (and where).
  - Avoid duplicate or conflicting security behavior.
- Files:
  - `server/index.ts`
  - `server/middleware/security.ts`

## Suggested PR Order

1. PR #1 (fallback removal)  
2. PR #2 (token transport hardening)  
3. PR #5 (CI permissions)  
4. PR #6 (logging cleanup)  
5. PR #3 (login protection)  
6. PR #4 (DB TLS)  
7. PR #7 and #8 (dependency remediation)  
8. PR #9 and #10 (cleanup/hardening follow-through)

