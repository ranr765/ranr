# Standing

A daily nutrition tracker. Log a meal, know where you stand.

Private, self-hosted, no third-party analytics. Built for someone who eats South
Asian food, lives in Switzerland, and opens this five or six times a day, usually
one-handed, often standing in a kitchen.

## What's here

This is **v1 — the core loop**: accounts, targets, manual logging, one-tap
repeats, and the daily standing view. The rest of the plan is below.

| | |
|---|---|
| Front end | React + TypeScript, Vite, no UI framework |
| API | Cloudflare Pages Functions (one file) |
| Database | Cloudflare D1 (SQLite), portable SQL |
| Hosting | Cloudflare Pages |
| Timezone | Europe/Zurich by default, per-user, correct while travelling |

## The rules the app enforces

These are constraints in code, not defaults you can drift past:

- **Rate of change is capped at 0.5–1% of body weight per week.** Ask for more
  and it tells you and sets 1%.
- **The calorie target is never below BMR.** If the maths would push it lower,
  it stops at BMR and says so.
- **Protein sits in 1.6–2.2 g/kg**, at the generous end while cutting.
- **Targets follow a 7-day weight average**, so they move as you do. A target
  set at the start of a cut is wrong three months later.
- **Estimates are always labelled as estimates**, with a confidence level and a
  one-tap correction. Correcting one turns it into a measured number.
- **Nothing here judges.** Over target is stated flatly. No red states, no
  streaks for eating less — the streak counts days logged, and it has a grace day.

## Running it

```bash
npm install
npm run db:migrate:local     # create the local D1 database
npm run dev                  # Vite on :5173
npx wrangler pages dev --proxy 5173 -- npm run dev   # app + API together
```

Tests need no dependencies at all — they run the real API against a
node:sqlite stand-in for D1:

```bash
npm test
npm run typecheck
```

## Deploying

Push to `main`. The workflow in `.github/workflows/deploy.yml` typechecks, tests,
creates the D1 database and Pages project on first run, backs up the database,
applies migrations, builds and deploys.

Two repository secrets are needed under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — a token with Pages + D1 edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard sidebar

The first account to register becomes the owner. To allow more accounts later,
set a `SIGNUP_CODE` environment variable on the Pages project; without it,
registration closes after the first account.

## Migrations are additive

`migrations/` is applied in order against a database holding real personal
records. Add tables and columns; never drop, rewrite or truncate what is already
there. The deploy workflow exports a backup before every migration run and keeps
it as a build artifact for 60 days.

## Design

Five named colours, everything derived from them — see `src/styles/tokens.css`.
Ink, Paper, Mist, Graphite, and Mulberry as the single accent, reserved for the
answer to "where do I stand" and for protein, which is the one number worth
raising a voice about in a deficit.

Three faces: Bricolage Grotesque for display, Inter for body, IBM Plex Mono for
every number. All self-hosted via `@fontsource`, so there is no third-party
request at runtime and the type is there offline. Numbers use tabular figures
throughout — they change constantly and must not jitter.

The daily standing view is the only place the design raises its voice. One
moment of motion when a meal is logged, and nothing else moves on its own.

## Speed

Logging a meal has to take under ten seconds end to end. It is measured on every
real log, on the device, and the median is shown in Settings. The timings never
leave the phone.

## Your data

`GET /api/export` returns everything as JSON — meals, foods, weights, settings.
No lock-in.

## What's next

1. ~~Auth, profile, target calculation~~ ✅
2. ~~Manual meal entry + the daily standing view~~ ✅
3. Photo and natural-language entry with LLM estimation, backed by the personal
   foods table that already exists in the schema
4. Weight tracking with the rolling average as the hero line
5. Weekly view — 7-day rolling average as the primary signal
6. Apple Health ingestion (`POST /api/health-ingest`) + the Shortcuts setup wizard
7. `export.xml` parser for historical backfill
8. PWA, offline logging with a sync queue, polish

The schema already carries what step 3 needs: `foods` is the personal library
that remembers corrections, and `entry_items` records `estimated`, `confidence`
and `edited` per item. Entries take a `client_id` so an offline queue replaying a
request can never double-log a meal — that path is tested.
