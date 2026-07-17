# Simple Serve — Business Book

Mobile-first mini ERP for Simple Serve (packing materials & disposables, Urakam,
Thrissur). Vanilla JS + Cloudflare Pages Functions + D1. Deployed to
https://simple-serve.pages.dev via `.github/workflows/deploy.yml` on push to main.
See SPEC.md for the full product spec.

## ⚠️ PRODUCTION DATA IS LIVE — NEVER DELETE OR RESET

Since 2026-07-17 the app holds REAL business records (sales, purchases, expenses,
payments, orders, shops, catalog edits). The owner has explicitly instructed that
this data must survive every future change to the app. Non-negotiable rules:

1. **Migrations must be additive only** — CREATE TABLE / ALTER TABLE ADD COLUMN /
   INSERT of new reference rows. Never DROP, DELETE, TRUNCATE or UPDATE that
   destroys or rewrites user-entered rows.
2. **Never trigger `.github/workflows/reset-transactions.yml` or
   `reset-login.yml`** (via the `.ops/*` marker files or manually) unless the
   owner explicitly asks for that exact reset in the current conversation.
3. When a schema change is risky, prefer new tables/columns over reshaping
   existing ones; the API can map old and new shapes.
4. If a destructive operation ever seems necessary, STOP and ask the owner first,
   and take a backup via `wrangler d1 export` in the workflow before anything else.

## Conventions

- Dates are 'YYYY-MM-DD' strings (IST business dates); `created_at` is UTC.
- Money in ₹ as REAL. Items serialize as "Label x qty @ ₹rate, ...".
- Bills are due immediately; `customers.credit_days` = days before an unpaid bill
  is highlighted OVERDUE (default 30).
- Frontend: public/static/app.js (no framework); API: functions/api/[[path]].js;
  local testing harness lives in the session scratchpad (Node + node:sqlite D1 mock).
