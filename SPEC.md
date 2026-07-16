# Simple Serve — Business Book v2 · Product Specification

This is the master prompt/spec for rebuilding the Simple Serve web app. It deconstructs
everything learned from the owner about the business and defines the v2 experience.

## 1. The business (context)

- **Simple Serve**, Urakam (near Health Centre), Thrissur, Kerala. Proprietor's brother
  runs it day-to-day; the owner (who commissioned this) reviews remotely.
- Trade: **buying packing materials & disposables wholesale, selling to shops** —
  bakeries, hotels, thattukadas, bazaars — across nearby routes (Urakam, Ollur, Cherpu…).
- Catalog: LD/HM covers (sold per kg, sized ¼ kg–25 kg), carry bags, paper/plastic
  glasses, plates, tissues, cling film, silver pouches, garbage bags, leaf, gloves, etc.
  Each item has a **buying rate and a selling rate** that vary deal-to-deal — book rates
  are defaults, every amount stays editable.
- Money flows: many sales are **on credit (pending)**; shops pay later ("collections").
  Suppliers also extend credit. Payment discipline matters: every shop has
  **credit days** (default 15) and bills become **overdue** past that.
- Non-goods costs: petrol, vehicle repair, electricity, phone, rent, food, labour.
- **One-person operation on a phone**, entries made mid-conversation in a shop.
  Speed and clarity beat features. English UI, ₹ everywhere, dd/mm/yyyy dates.

## 2. What the app must do (unchanged core)

1. **10-second capture**: Sale / Purchase / Expense from the home screen.
   Item picker (auto-price from catalog), cash vs credit chips, editable totals.
2. **Khata (ledger)**: per-shop and per-supplier balances; Collect / Pay entries.
3. **Statements & invoices**: per-shop pending bills with bought-on dates, pay-by
   dates, overdue flags; share as WhatsApp text or a branded **invoice image** carrying
   the owner's **UPI Scan & Pay QR**.
4. **Catalog**: items with dual prices, add/edit/import.
5. **Monthly P&L**: sales − purchases − expenses, expense breakdown, outstanding.
6. **Auth**: single owner account, first-run claim, 90-day sessions, password change,
   login reset ops path. Central D1 storage — same data on every device.

## 3. v2 experience — what changes

### Design direction ("the better tone")
Reference the leading Indian shop-ledger apps — **Khatabook, OkCredit, Vyapar** — whose
patterns shop owners already know:
- **Twin headline numbers** on home: green "To collect" / red "To pay" (OkCredit's
  you'll-get/you'll-give pattern) — the two numbers a trader actually wakes up to.
- **Khata-style party list**: initial-letter avatars, name + place, right-aligned
  colored balance, one-tap remind/collect (Khatabook pattern).
- **Cards on a soft tinted ground**, one strong brand color used sparingly, generous
  white space, big tappable rows (all three apps).
- Simple Serve keeps its own identity: the **brand red + gold** from the shop's board,
  but v2 shifts the ground to a warm paper tone with red reserved for identity and
  alerts; money semantics are green (in) / red (out) / amber (pending).

### Tone & engagement
- Greet by name with time of day ("Good morning, Rajesh 👋") and one useful line
  ("3 shops crossed their pay-by date — ₹4,200 to collect").
- Empty states teach the next step, never dead-end.
- Every destructive action confirms; every success toasts.

### Reports (the "very good report")
- **Month in one screen**: P&L headline, profit state, cash vs credit split.
- **Daily sales chart** (bar) and **6-month trend** (profit line/bars) for direction.
- **Expense breakdown** with proportion bars, **top pending shops** ranked.
- Everything exportable (CSV) and month-navigable.

## 4. Non-negotiables

- No frameworks, no build step: vanilla HTML/CSS/JS + Cloudflare Pages Functions + D1.
- Data model and API stay compatible; only additive endpoints (e.g. /api/report/trend).
- Mobile-first at 390px; works on a laptop; light & dark themes.
- Deploys via the existing GitHub Actions pipeline on push to main.
