# CLAUDE.md

## Project Overview

**Schweizer Deutsch Coach** — an adaptive language learning platform for Swiss German (A0→B1 CEFR levels). Full-stack web application deployed on Cloudflare Pages with D1 database.

## Tech Stack

- **Backend:** Hono 4.x (TypeScript/TSX) on Cloudflare Workers
- **Frontend:** Vanilla JavaScript (ES6+) SPA with Tailwind CSS (CDN) and Axios (CDN)
- **Database:** Cloudflare D1 (SQLite), raw SQL queries (no ORM)
- **Build:** Vite 6.x with `@hono/vite-build` for Cloudflare Pages
- **Deploy:** Wrangler CLI → Cloudflare Pages
- **Runtime:** Node.js 18+

## Repository Structure

```
src/
  index.tsx          # Backend: Hono app, all API routes, main HTML page
  renderer.tsx       # JSX renderer template
public/static/
  app.js             # Frontend: SPA logic, DOM manipulation, API calls
  style.css          # Custom styles (Tailwind via CDN for utilities)
migrations/
  0001_initial_schema.sql   # 14 tables with indexes
  0002_seed_content.sql     # Vocabulary, content items, strategy tips
```

Key config files: `wrangler.jsonc` (Cloudflare bindings), `vite.config.ts` (build), `tsconfig.json` (strict mode, ESNext), `ecosystem.config.cjs` (PM2 for local dev).

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server with hot reload
npm run build            # Production build to dist/
npm run dev:sandbox      # Run with Wrangler + local D1 on port 3000
npm run deploy:prod      # Build and deploy to Cloudflare Pages

# Database
npm run db:migrate:local # Apply migrations to local D1
npm run db:migrate:prod  # Apply migrations to production D1
npm run db:console:local # Open local D1 console

npm run clean-port       # Kill processes on port 3000
```

**Local development flow:** `npm run db:migrate:local` (first time), then `npm run dev`.

## Architecture

### Backend (src/index.tsx)

Single-file Hono app with all API routes. D1 database accessed via `c.env.DB` binding.

**API endpoints:**
- `POST /api/users` — create user + initialize skill levels
- `GET /api/users/:userId` — get user profile with skills
- `GET /api/diagnostic` — get placement test items
- `POST /api/diagnostic/submit` — submit diagnostic, calculate level
- `GET /api/session/daily/:userId` — generate adaptive daily session
- `POST /api/session/submit` — submit session results, update mastery
- `GET /api/progress/:userId` — get progress analytics
- `GET /api/vocabulary/due/:userId` — get SRS due vocabulary
- `POST /api/vocabulary/review` — submit vocabulary review (SM-2)
- `GET /api/tips` — strategy tips (filterable by `?skill=` and `?level=`)
- `GET /api/mock/:userId` — mock exam data

### Frontend (public/static/app.js)

Vanilla JS SPA using `showPage()` for navigation between screens: welcome, diagnostic, dashboard, session, progress. State is managed via global variables and persisted to `localStorage`.

### Database (14 tables)

Core tables: `users`, `user_skills`, `mastery_nodes`, `content_items`, `srs_queue`, `sessions`, `session_items`, `mock_results`, `vocabulary`, `user_vocabulary`, `strategy_tips`.

- `snake_case` column names
- Foreign key constraints, unique constraints on composite keys
- Timestamps (`created_at`, `updated_at`) on all tables

### Adaptive Learning Algorithm

- Session item selection: 60% weakest mastery nodes, 30% current level, 10% stretch items
- SM-2 spaced repetition for vocabulary
- Mastery score = correct_count / attempts per skill × theme × tactic × level

## Code Conventions

- **TypeScript strict mode** enabled for backend
- **camelCase** for JS functions and variables
- **snake_case** for database columns
- **Section comments** use `// ========== Section Name ==========` style
- **Async/await** for all asynchronous operations
- **Arrow functions** for event handlers and callbacks
- **Template literals** for inline HTML generation in frontend
- **Early returns** for error handling in API routes
- **JSON responses** for all API endpoints; errors return `{ error: "message" }` with appropriate HTTP status

## API Design

- RESTful routes under `/api/*`
- CORS enabled on all `/api/*` routes
- Request bodies are JSON (`c.req.json()`)
- User identification by UUID (`userId` parameter), no authentication layer
- Query parameter filtering (e.g., `/api/tips?skill=reading&level=A2`)

## Database Binding

The D1 database is bound as `DB` in `wrangler.jsonc`. Access it in route handlers via:
```typescript
const result = await c.env.DB.prepare('SELECT ...').bind(param).first()
```

## Testing

No automated test framework is configured. Testing is done manually via the dev server. When adding tests, Vitest would be the natural choice given the Vite build setup.

## Deployment

1. Set the real D1 `database_id` in `wrangler.jsonc`
2. `npm run db:migrate:prod` to apply schema
3. `npm run deploy:prod` to build and deploy

Environment secrets go in `.dev.vars` (local) or Cloudflare dashboard (production). These files are gitignored.

## Important Notes

- The entire backend is a single file (`src/index.tsx`, ~800 lines). All route additions go here.
- The entire frontend is a single file (`public/static/app.js`, ~800 lines). All UI changes go here.
- Static assets are served from `public/` via Hono's `serveStatic` middleware.
- CDN dependencies (Tailwind, Axios, Font Awesome) are loaded in the HTML template in `src/index.tsx`.
- No framework-level state management — the frontend uses plain global variables.
- The `wrangler.jsonc` `database_id` is set to `"placeholder-id"` and must be replaced for real deployment.
