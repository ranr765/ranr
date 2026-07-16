# CLAUDE.md

## Project Overview

**Schweizer Deutsch Coach** — An adaptive Swiss German learning platform (A0 → B1) built on Cloudflare Workers/Pages with Hono and D1. Users complete 30-minute daily sessions covering reading, listening, speaking, and writing skills in real Swiss contexts (housing, transport, healthcare, administration, work, school).

## Tech Stack

- **Framework**: [Hono](https://hono.dev/) v4.10+ (lightweight edge web framework)
- **Runtime**: Cloudflare Workers / Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite-based)
- **Build Tool**: Vite 6 with `@hono/vite-build` (Cloudflare Pages adapter) and `@hono/vite-dev-server`
- **Frontend**: Vanilla JavaScript + Tailwind CSS (via CDN) + Font Awesome icons (via CDN)
- **HTTP Client (frontend)**: Axios (via CDN)
- **Process Manager**: PM2 (via `ecosystem.config.cjs`)
- **Language**: TypeScript (server), JavaScript (client)

## Repository Structure

```
ranr/
├── src/
│   ├── index.tsx          # Main Hono app — all API routes + HTML page (SSR)
│   └── renderer.tsx       # JSX renderer (currently unused by main page)
├── public/
│   └── static/
│       ├── app.js         # Frontend SPA logic (vanilla JS, ~830 lines)
│       └── style.css      # Minimal custom styles (Tailwind handles most styling)
├── migrations/
│   ├── 0001_initial_schema.sql   # Database schema (12 tables)
│   └── 0002_seed_content.sql     # Seed data (vocabulary, content items, strategy tips)
├── package.json
├── tsconfig.json
├── vite.config.ts         # Vite config with Hono Cloudflare Pages plugin
├── wrangler.jsonc         # Cloudflare Workers/Pages config (D1 binding)
├── ecosystem.config.cjs   # PM2 config for local dev server
├── .gitignore
├── README.md
├── DEPLOYMENT.md
├── SHARING_GUIDE.md
└── SHARE_OPTIONS.md
```

## Key Architecture Decisions

- **Single-file server**: All API routes and the HTML shell live in `src/index.tsx`. The root route (`/`) returns a full HTML page with inline styles and CDN script tags.
- **Client-side SPA**: `public/static/app.js` is a vanilla JS SPA that manages page navigation, state, and API calls. No framework (React, Vue, etc.) is used.
- **State management**: Client-side state uses global JS variables and `localStorage` for user persistence.
- **D1 bindings**: The database is accessed via the `c.env.DB` binding (type `D1Database`). All queries use prepared statements with `.bind()`.
- **No ORM**: Raw SQL queries via D1's prepared statement API.
- **JSX for Hono**: TSConfig uses `"jsxImportSource": "hono/jsx"` for server-side JSX, though the main page uses template literals.

## Development Commands

```bash
# Install dependencies
npm install

# Local development (Vite dev server with Hono adapter)
npm run dev

# Build for production
npm run build

# Run local sandbox with D1 (after building)
npm run dev:sandbox

# Start via PM2 (runs wrangler pages dev)
pm2 start ecosystem.config.cjs

# Apply database migrations locally
npm run db:migrate:local

# Apply database migrations to production
npm run db:migrate:prod

# Deploy to Cloudflare Pages
npm run deploy:prod

# Generate Cloudflare types
npm run cf-typegen

# Kill process on port 3000
npm run clean-port
```

## Database

### D1 Configuration

- **Binding name**: `DB`
- **Database name**: `webapp-production`
- **Config file**: `wrangler.jsonc`
- Migrations are in `migrations/` and applied via `wrangler d1 migrations apply`

### Schema (12 tables)

| Table | Purpose |
|---|---|
| `users` | User profiles, levels (A0-B1), streaks, onboarding state |
| `user_skills` | Per-skill (reading/listening/speaking/writing) level tracking |
| `mastery_nodes` | Granular mastery: skill × theme × tactic × level |
| `content_items` | Practice items (JSON `content` field with questions/options/answers) |
| `srs_queue` | Spaced repetition scheduling (SM-2 algorithm) |
| `sessions` | Daily practice session records |
| `session_items` | Individual item responses within sessions |
| `mock_results` | Mock exam scores |
| `vocabulary` | Word bank with translations and examples |
| `user_vocabulary` | Per-user vocab progress |
| `strategy_tips` | Test-taking strategy tips |

### Key Patterns

- `content_items.content` is a JSON string containing: `text`/`transcript`, `question`, `options`, `correct_answer` (index), `explanation`, optional `strategy_hint`, `audio_prompt`, `sample_answer`, `tasks`, `checklist`, `word_count`.
- User IDs are UUIDs generated via `crypto.randomUUID()`.
- Dates use SQLite date functions: `datetime('now')`, `date('now', '+N days')`.

## API Routes

All API routes are prefixed with `/api/` and have CORS enabled.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/users` | Create user + initialize skills |
| GET | `/api/users/:userId` | Get user profile + skills |
| GET | `/api/diagnostic` | Get placement test items (16 items) |
| POST | `/api/diagnostic/submit` | Submit diagnostic, update levels |
| GET | `/api/session/daily/:userId` | Get adaptive daily session |
| POST | `/api/session/submit` | Submit session responses, update mastery + SRS |
| GET | `/api/progress/:userId` | Dashboard data (skills, sessions, weak areas) |
| GET | `/api/vocabulary/due/:userId` | Get due SRS vocabulary items |
| POST | `/api/vocabulary/review` | Submit vocab review (SM-2 scoring) |
| GET | `/api/tips` | Get strategy tips (optional `skill`/`level` filters) |
| GET | `/api/mock/:userId` | Get mock exam items (`type=mini-mock` or `full-mock`) |
| GET | `/` | Main HTML page (full SPA shell) |

## Coding Conventions

- **Server code**: TypeScript with strict mode, ESNext target, Hono-style route handlers (`app.get()`, `app.post()`)
- **Client code**: Vanilla JavaScript (ES6+), no modules, global functions
- **Naming**: camelCase for JS/TS variables and functions, snake_case for database columns
- **SQL**: Uppercase keywords (`SELECT`, `INSERT`, `WHERE`), parameterized queries via `.bind()`
- **Error handling**: Server routes return JSON errors with HTTP status codes (e.g., `c.json({ error: '...' }, 404)`). Client uses try/catch with `console.error` and `alert()`.
- **CSS**: Tailwind utility classes (via CDN) with a few custom classes (`.gradient-bg`, `.card`, `.btn-primary`, `.skill-badge`, `.level-*` variants)
- **Inline HTML**: The root route returns a full HTML string template (not JSX) containing all screens/pages
- **Content format**: Practice items store structured data as JSON strings in the `content` column

## Important Notes for AI Assistants

1. **Build before sandbox**: Always run `npm run build` before `npm run dev:sandbox` — the sandbox serves from `dist/`.
2. **Database migrations**: New schema changes must go in `migrations/` as sequentially numbered SQL files (e.g., `0003_*.sql`). Apply with `npm run db:migrate:local`.
3. **No test framework**: There is no test runner configured. The project has no automated tests.
4. **No linter/formatter**: No ESLint, Prettier, or similar tooling is configured.
5. **CDN dependencies**: Tailwind CSS, Font Awesome, and Axios are loaded via CDN `<script>`/`<link>` tags in the HTML — they are not npm dependencies.
6. **Static files**: Files in `public/static/` are served at `/static/*` by Hono's `serveStatic` middleware.
7. **Content items are JSON**: When adding new practice content, the `content` column must be a valid JSON string matching the expected schema for that item `type` (reading, listening, speaking, writing).
8. **userId-based access**: API endpoints use `userId` path params or request body fields for data access. There is no authentication middleware.
9. **Port 3000**: The local dev sandbox runs on port 3000. Use `npm run clean-port` if the port is already in use.
10. **Compatibility flags**: `wrangler.jsonc` includes `nodejs_compat` flag for Node.js API compatibility in Workers.
