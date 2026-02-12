# Swissclaw Hub

A shared web interface for operators and assistants to communicate, collaborate, and track activities.

**Live:** https://your-instance.example.com

## Project Structure

```
server/
â”œâ”€â”€ index.ts                # Express + Socket.io server
â”œâ”€â”€ config/
â”‚   â””â”€â”€ database.ts         # PostgreSQL pool & schema (initDb)
â”œâ”€â”€ middleware/
â”‚   â”œâ”€â”€ auth.ts             # Session auth, CSRF, rate limiting
â”‚   â””â”€â”€ security.ts         # Helmet, XSS, audit logging
â”œâ”€â”€ routes/
â”‚   â””â”€â”€ auth.ts             # Login/logout/session routes
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ logger.ts           # Pino structured logging
â”‚   â””â”€â”€ errors.ts           # asyncHandler + error middleware
â””â”€â”€ types/
    â””â”€â”€ index.ts            # Shared server type definitions

client/src/
â”œâ”€â”€ App.tsx                 # Main app (socket.io, real-time)
â”œâ”€â”€ App.css
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ KanbanBoard.tsx     # Drag-and-drop kanban (@dnd-kit)
â”‚   â””â”€â”€ KanbanBoard.css
â”œâ”€â”€ types/
â”‚   â””â”€â”€ index.ts            # Frontend type definitions
â””â”€â”€ __tests__/
    â””â”€â”€ App.test.js

tests/
â”œâ”€â”€ unit/                   # Unit tests (mocked DB)
â”œâ”€â”€ api/                    # Contract tests (real server + DB)
â”œâ”€â”€ integration/            # Full flow tests (real server + DB)
â””â”€â”€ zzz-teardown.test.js    # Closes pg pool & socket.io
```

## Features

- Real-time status dashboard with WebSocket updates
- Interactive chat with Socket.io
- Drag-and-drop kanban board with search and priority filtering
- Activity feed with timestamps
- Session-based authentication with CSRF protection
- PostgreSQL database with raw SQL (no ORM at runtime)
- Structured logging (pino)
- CI/CD with GitHub Actions and Codecov

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18, TypeScript, @dnd-kit |
| **Backend** | Node.js, Express, TypeScript |
| **Real-time** | Socket.io |
| **Database** | PostgreSQL 15+ (pg driver) |
| **Auth** | Session-based (bcrypt + secure cookies) |
| **Security** | Helmet, rate limiting, CORS, input validation |
| **Testing** | Jest, ts-jest, supertest, React Testing Library |
| **CI/CD** | GitHub Actions, Codecov |
| **Hosting** | Render (free tier) |

## Local Development

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your database URL
```

3. Start development server:
```bash
npm run dev
```

This starts:
- Backend on http://localhost:3001 (via ts-node)
- Frontend on http://localhost:3000

## Testing

See [TESTING.md](TESTING.md) for the full testing guide.

Quick start:
```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d test-db

# Run all backend tests
npm run test:with-db

# Run client tests
npm run test:client

# Stop test database
docker-compose -f docker-compose.test.yml down
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | `development` or `production` | Yes |
| `PORT` | Server port (default: 3001) | No |
| `CLIENT_URL` | Frontend URL for CORS | Production |
| `AUTH_USERNAME` | Login username | Yes |
| `AUTH_PASSWORD` | Login password (bcrypt hashed) | Yes |

## Deployment

Auto-deploys from `master` branch to Render. See [docs/project-info.md](docs/project-info.md) for hosting details.

Build command:
```bash
npm install && cd client && npm install && npm run build && cd .. && npm run build
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend + frontend in dev mode |
| `npm run build` | Build server (tsc) + client (react-scripts) |
| `npm start` | Start production server |
| `npm test` | Run backend tests |
| `npm run test:with-db` | Run backend tests with local Docker DB |
| `npm run test:client` | Run React tests |
| `npm run lint` | ESLint server code |
| `npm run type-check` | TypeScript type checking |
