# CLAUDE.md — Schweizer Deutsch Coach

## Project Overview

Adaptive learning platform for Swiss German (Schweizer Deutsch) that takes users from A0 to B1 in 30-minute daily sessions. Full-stack TypeScript app deployed on Cloudflare Pages with D1 (SQLite) database.

## Tech Stack

- **Backend:** TypeScript + Hono 4.10+ (edge framework)
- **Frontend:** Vanilla JavaScript + Tailwind CSS (via CDN)
- **Runtime:** Cloudflare Workers/Pages
- **Database:** Cloudflare D1 (SQLite), bound as `DB`
- **Build:** Vite 6.3+
- **CLI:** Wrangler 4.4+

## Directory Structure

```
src/
  index.tsx          # Hono server — all API routes (~800 lines)
  renderer.tsx       # JSX renderer for HTML layout
public/static/
  app.js             # Frontend client logic (~800 lines, vanilla JS)
  style.css          # Minimal custom styles (Tailwind via CDN)
migrations/
  0001_initial_schema.sql   # Database schema (14 tables)
  0002_seed_content.sql     # Seed data (content, vocab, tips)
wrangler.jsonc       # Cloudflare config with D1 binding
vite.config.ts       # Vite build config
```

## Commands

```bash
# Development
npm run dev                  # Start Vite dev server
npm run dev:sandbox          # Run with wrangler + local D1 on port 3000
npm run build                # Build for production

# Database
npm run db:migrate:local     # Apply migrations to local D1
npm run db:migrate:prod      # Apply migrations to production D1

# Deployment
npm run deploy:prod          # Build + deploy to Cloudflare Pages
```

## Architecture & Conventions

### API Routes (all in `src/index.tsx`)

All routes are defined in a single Hono app. Key endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/users` | Create user |
| GET | `/api/users/:userId` | Get user profile |
| GET | `/api/diagnostic` | Placement test items |
| POST | `/api/diagnostic/submit` | Submit diagnostic |
| GET | `/api/session/daily/:userId` | Generate adaptive 6-section session |
| POST | `/api/session/submit` | Submit session responses |
| GET | `/api/progress/:userId` | Progress dashboard |
| GET | `/api/vocabulary/due/:userId` | SRS vocab queue |
| POST | `/api/vocabulary/review` | Submit vocab review (SM-2) |
| GET | `/api/tips` | Strategy tips |
| GET | `/api/mock/:userId` | Mock exam items |
| GET | `/` | Serve main HTML page |

### Database

14 tables in Cloudflare D1. Key tables: `users`, `content_items`, `mastery_nodes`, `srs_queue`, `sessions`, `vocabulary`, `user_vocabulary`. Access via `c.env.DB` binding in Hono handlers. All queries use D1's prepared statement API (`db.prepare(...).bind(...).all()`).

### Frontend

Single-page app in `public/static/app.js`. No framework — uses vanilla JS with:
- `showPage()` for navigation between views
- `localStorage` for state persistence (userId, streaks)
- Axios (CDN) for HTTP requests
- Dynamic HTML rendering via template literals

### Adaptive Learning Algorithm

Sessions select content using: **60% weak areas** (lowest mastery), **30% current level**, **10% stretch** (+1 level).

### Spaced Repetition (SM-2)

Intervals: 1d → 3d → 7d → 14d → 30d. Incorrect answers reset to 1 day. Ease factor adjusts per review.

### Domain Model

- **CEFR Levels:** A0, A1, A2, B1
- **Skills:** Reading, Listening, Speaking, Writing
- **Themes:** Housing, Transport, Healthcare, Administration, Work, School
- **Tactics:** Skim, Scan, Inference, Paraphrase, Role-play, Detail, Gist, Predict

## Code Style

- No linter or formatter is configured. Follow existing conventions:
  - TypeScript for backend (`src/`), vanilla JS for frontend (`public/static/`)
  - Use Hono's `c.env.DB` for database access
  - Content items store exercise data as JSON strings in `content_json` column
  - Frontend CDN libraries: Tailwind CSS, Font Awesome 6.4, Axios 1.6

## Testing

No automated test framework is set up. Test changes manually via `npm run dev:sandbox` with local D1.

## Deployment

Manual deployment via `npm run deploy:prod` (builds with Vite, deploys to Cloudflare Pages via wrangler). Database migrations must be applied separately with `npm run db:migrate:prod`.
