# Simple Serve — Business Book

A simple, mobile-first web app (mini ERP) for **Simple Serve** — packing materials
& disposable items business (paper glasses, plates, sheets, packing covers, tissue
paper), Urakam, Thrissur.

Built for a one-person business: capture the day's activity in a few taps, and the
monthly profit & loss comes out automatically.

## What it does

**Home tab — quick capture (the daily workflow)**
- **Sale** — pick the shop (or add a new one on the spot), items sold, total amount,
  and how much cash was received now. "Full cash" / "Full credit" one-tap chips.
- **Purchase** — supplier, items bought, total, paid now.
- **Expense** — preset categories: Petrol / Fuel, Vehicle Repair, Electricity,
  Phone / Internet, Rent, Food / Tea, Packing Material, Labour / Help, Other.
- **Collect payment / Pay supplier** — settle old credit balances.
- Today's totals and the running month's profit at a glance.

**Entries tab** — browse sales / purchases / expenses / collections by month, delete
mistakes.

**Shops tab** — customers and suppliers with live credit balances: how much each shop
still owes you, and what you owe each supplier. Collect / pay straight from the list.

**Report tab** — monthly Profit & Loss:

```
Sales                 (cash received + given on credit)
− Purchases
− Expenses            (broken down by category)
= Net profit
```

plus overall outstanding amounts and a daily sales chart. One-tap **CSV export** of
the whole month for backup or Excel.

## Tech

Deliberately boring and dependency-free:

- **Cloudflare Pages** static site (`public/`) — plain HTML / CSS / vanilla JS
- **Cloudflare Pages Functions** (`functions/api/[[path]].js`) — the whole API in
  one file, no framework, no build step
- **Cloudflare D1** (SQLite) for storage — data is shared across devices, so you can
  enter on the phone and review on a laptop
- The only dev dependency is `wrangler` (Cloudflare's CLI), used to run locally and
  deploy. The free tier covers this app comfortably.

## Run locally

```bash
npm install
npm run db:migrate:local     # create the local SQLite DB
npm run dev                  # serves on http://localhost:3000
```

## Deploy (Cloudflare Pages)

1. `npx wrangler login`
2. Create the database and put its id into `wrangler.jsonc`:
   ```bash
   npm run db:create
   # copy the printed database_id into wrangler.jsonc
   ```
3. Apply migrations and deploy:
   ```bash
   npm run db:migrate:prod
   npm run deploy
   ```
4. Share the `*.pages.dev` URL. On the phone, open it in the browser and use
   **"Add to Home screen"** so it opens like an app.

> Note: there is no login yet — anyone with the URL can see and edit the data.
> Keep the URL private, or add Cloudflare Access / a simple PIN in front of it
> if that becomes a concern.

## Data model

| Table | Purpose |
|---|---|
| `customers` / `suppliers` | shops you sell to / places you buy from |
| `sales` / `purchases` | each with `total_amount` and `paid_amount` — the difference is credit |
| `expenses` | category + amount |
| `payments` | later settlements: `in` = collected from a shop, `out` = paid to a supplier |

Balance of a shop = its sales total − paid at sale time − later collections.
Monthly profit = sales − purchases − expenses (cash-book style).
