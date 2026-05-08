# CVZ Cricket Selection

A simple voting app for finalising the CVZ playing XI. Each match has four
selectors who tick the players they want; the live tally shows who's in.

Built with Hono + Cloudflare Pages + D1.

## Features

- One match per fixture, with date, time, type (T20 by default) and team size
- 14 players seeded for the two 10 May matches (editable; you can add/remove)
- Four named selector slots per match — rename them inline by double-clicking
- Each selector ticks players → the top N (= team size) with the most votes
  make the XI; the cutoff row is highlighted
- Live tally bar chart, "X / 4 voted" indicator
- One shareable URL per match (copies to clipboard or uses the native share
  sheet on mobile)
- Per-match storage: votes don't bleed between fixtures

## Routes

- `GET /` — list of matches, "+ New match" creates one (optionally copying the
  player list from the latest match)
- `GET /m/:id` — vote for that match, edit players/selectors, see the tally

API: `/api/matches`, `/api/matches/:id`, `/api/matches/:id/state`,
`/api/matches/:id/players`, `/api/matches/:id/voters/:slot`,
`/api/matches/:id/votes`.

## Local development

```bash
npm install
npm run db:migrate:local
npm run build
npm run dev:sandbox
```

Then open http://localhost:3000.

## Deploy to Cloudflare Pages

### Option A — manual (one-shot)

```bash
npx wrangler login
npx wrangler d1 create webapp-production         # paste id into wrangler.jsonc
npx wrangler pages project create webapp --production-branch=main
npm run db:migrate:prod
npm run deploy:prod
```

### Option B — GitHub Actions auto-deploy

`.github/workflows/deploy.yml` runs migrations + deploys on every push to
`main` (and on manual dispatch). One-time setup:

1. **Create the D1 database** (locally or in the Cloudflare dashboard):
   ```bash
   npx wrangler login
   npx wrangler d1 create webapp-production
   ```
   Paste the printed `database_id` into `wrangler.jsonc`
   (`d1_databases[0].database_id`) and commit.

2. **Create the Pages project** (once, so the deploy step has somewhere to push):
   ```bash
   npx wrangler pages project create webapp --production-branch=main
   ```
   Or create it via the Cloudflare dashboard with the name `webapp`.

3. **Add GitHub repo secrets** (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN` — create at
     https://dash.cloudflare.com/profile/api-tokens using the
     **"Edit Cloudflare Workers"** template (or a custom token with
     `Account → Cloudflare Pages: Edit` and `Account → D1: Edit`)
   - `CLOUDFLARE_ACCOUNT_ID` — found in the Cloudflare dashboard sidebar

4. Merge to `main` (or run the workflow manually from the Actions tab). The
   workflow log prints the live `https://webapp.pages.dev` URL.

## Schema

`matches`, `players (match_id → matches)`, `voters (match_id, slot 1..4)`,
`votes (voter_id, player_id)`. See `migrations/0001_initial_schema.sql`.

## Sharing

Open a match and tap **Share link** — it copies the per-match URL (e.g.
`https://your-app.pages.dev/m/1`) which anyone in the group can use.
