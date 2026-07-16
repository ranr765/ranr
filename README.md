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
- **🧾 Bill statement per shop** — pending bills with pay-by dates (from the shop's
  credit-days terms), split into overdue vs not-yet-due, and a one-tap
  **Share on WhatsApp** button that opens the shop's chat with the summary filled in
  (or Copy text). Collections are applied to the oldest bills first.
- **⇪ Import** — paste a list of shops (`Name, Place, Phone, Credit days` — one per
  line) to add them in bulk when you get the address list.

**Login** — the app is fully protected by a username + password:
- On the very first visit the app shows a one-time **setup screen** to create the
  owner account (no default passwords anywhere).
- Sessions last 90 days per device (stored as HttpOnly secure cookies), so the
  phone stays logged in for daily use.
- The 👤 button in the header opens the account menu: **change password** (which
  logs out every other device) and **logout**.
- Every API route rejects requests without a valid session. Passwords are stored
  as salted PBKDF2-SHA256 hashes (100k iterations), never in plain text.

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

## Go live (one-time, ~10 minutes, no coding)

The repo ships with a GitHub Action that does the whole deployment — database,
migrations, hosting — automatically. You only connect the accounts once:

1. **Create a free Cloudflare account** at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
   (email + password, no card needed — the free tier covers this app).
2. **Copy your Account ID** — shown in the right sidebar of the Cloudflare
   dashboard home (or under Workers & Pages → Overview).
3. **Create an API token** — dashboard → My Profile → API Tokens →
   *Create Token* → *Create Custom Token* with permissions:
   - Account → **Cloudflare Pages** → Edit
   - Account → **D1** → Edit
4. **Add both to GitHub** — this repo → Settings → Secrets and variables →
   Actions → *New repository secret*:
   - `CLOUDFLARE_API_TOKEN` = the token
   - `CLOUDFLARE_ACCOUNT_ID` = the account id
5. **Run it** — repo → Actions tab → *Deploy to Cloudflare Pages* →
   *Run workflow*. (After that it also redeploys automatically on every push
   to `main`.)

The workflow prints the live URL at the end — `https://simple-serve.pages.dev`.
Send that link to the owner: **the first person to open it claims the account**
(sets username + password), so open it yourself first or send it straight to him.
On the phone, use the browser's **"Add to Home screen"** so it opens like an app.
Data is stored centrally in Cloudflare D1 — the same numbers appear on every
phone and laptop.

### Deploy from your own machine instead (optional)

```bash
npm install && npx wrangler login
npm run db:create          # copy the printed database_id into wrangler.jsonc
npm run db:migrate:prod
npm run deploy
```

## Data model

| Table | Purpose |
|---|---|
| `customers` / `suppliers` | shops you sell to / places you buy from |
| `sales` / `purchases` | each with `total_amount` and `paid_amount` — the difference is credit |
| `expenses` | category + amount |
| `payments` | later settlements: `in` = collected from a shop, `out` = paid to a supplier |
| `users` / `sessions` | login accounts (salted PBKDF2 hashes) and device sessions |

Balance of a shop = its sales total − paid at sale time − later collections.
Monthly profit = sales − purchases − expenses (cash-book style).
