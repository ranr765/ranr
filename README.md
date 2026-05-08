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

```bash
# create the D1 database once and put its id in wrangler.jsonc
npx wrangler d1 create webapp-production
npm run db:migrate:prod
npm run deploy:prod
```

## Schema

`matches`, `players (match_id → matches)`, `voters (match_id, slot 1..4)`,
`votes (voter_id, player_id)`. See `migrations/0001_initial_schema.sql`.

## Sharing

Open a match and tap **Share link** — it copies the per-match URL (e.g.
`https://your-app.pages.dev/m/1`) which anyone in the group can use.
