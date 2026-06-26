# Treasury — Transaction Currency Net Balance (Power BI Project)

A code-based Power BI Project (**PBIP**) that visualizes **net balance by transaction
currency, by period**, with graphical breakdowns. It is the visual successor to the
matrix dashboard built on the `Summarized_Union` model.

## What's in here

```
powerbi/
├── TreasuryNetBalance.pbip                      ← open THIS in Power BI Desktop
├── TreasuryNetBalance.SemanticModel/            ← data model (TMDL)
│   └── definition/
│       ├── model.tmdl                           ← model + relationship
│       ├── database.tmdl
│       └── tables/
│           ├── Summarized_Union.tmdl            ← fact table + all measures + SAMPLE DATA
│           └── Date.tmdl                         ← date dimension w/ semi-monthly Period buckets
└── TreasuryNetBalance.Report/                   ← report layout (PBIR)
    └── definition/pages/netbalance/             ← one page, 7 visuals
```

## How to open

1. Use a recent **Power BI Desktop** (Sep 2024 or later).
2. Enable the preview features (only needed once):
   *File → Options and settings → Options → Preview features* →
   tick **Power BI Project (.pbip) save option** and **Store reports using enhanced
   metadata format (PBIR)**. Restart.
3. Open `TreasuryNetBalance.pbip`.

The project ships with **sample data that mirrors the original matrix**, so every visual
renders immediately — no data source needed to evaluate the design.

## The dashboard

| Visual | Field wells |
|--------|-------------|
| Card — Total Net (CHF) | Values = `[Net CHF]` |
| Card — Currencies in Deficit | Values = `[Currencies in Deficit]` |
| Card — Largest Short Currency | Values = `[Largest Short Currency]` |
| Slicer — Transaction Currency | Field = `Summarized_Union[Transaction Currency]` |
| **Clustered column — Net Balance by Period & Currency** | Axis = `Date[Period End]`, Legend = `Transaction Currency`, Values = `[Net CHF]` |
| **Line — Cumulative Net Position** | Axis = `Date[Period End]`, Legend = `Transaction Currency`, Values = `[Cumulative Net CHF]` |
| **Matrix (detail)** | Rows = `Transaction Currency`, `Countervalue Currency`; Columns = `Date[Period]`; Values = `[Net Amount]` |

### Measures (in `Summarized_Union`)

| Measure | Definition | Use |
|---------|-----------|-----|
| `Net Amount` | `SUM(Countervalue Amount)` | per-currency visuals only (native currency) |
| `Net CHF` | `SUM(CHF_NEW)` | **safe to total/compare across currencies** |
| `Net Exposure CHF` | `ABS([Net CHF])` | ranking currencies by size |
| `Cumulative Net CHF` | running total over `Date[Period End]` | trend / position line |
| `Currencies in Deficit` | count of currencies where `[Net CHF] < 0` | KPI |
| `Largest Short Currency` | currency with the most negative `[Net CHF]` | KPI |

## Assumptions I made (change these to match your real model)

These were not confirmed, so the model uses defaults. Adjust in `Summarized_Union.tmdl`:

1. **Signed amount** = `Countervalue Amount` (assumed already +/- signed; `DC` is included as
   a +1/-1 helper). If your amount is unsigned, change `Net Amount` to
   `SUMX(Summarized_Union, [Transaction Amount] * [DC])`.
2. **Period date** = `Net Payment due date` (the relationship column). If periods should be
   driven by `Delivery_Date2` instead, repoint the relationship in `model.tmdl`.
3. **Common currency** = `CHF_NEW`. In the sample data `CHF_NEW` equals the countervalue
   amount; in your data it is the bank's CHF-converted column, so cross-currency totals will
   be correct once real data is loaded.
4. **Period buckets** = semi-monthly (15th / month-end), reproducing the 30/06, 15/07, 31/07…
   columns. Edit the `Period End` logic in `Date.tmdl` for different buckets.
5. **Transaction Currency** maps to your `Document currency.Document currency Level 01.Key`.

## Binding to your real data

Pick one:

- **Repoint this model** — open `Summarized_Union.tmdl`, replace the `partition … = m`
  sample-data block with your real source (SQL / Excel / your existing query), keeping the
  output column names. Add any extra columns you need.
- **Copy into your existing .pbix** — open your current report, *File → Save as → .pbip*,
  then copy the measures from `Summarized_Union.tmdl`, the whole `Date.tmdl` table, and the
  visual folders under `TreasuryNetBalance.Report/.../visuals/` into your project.

> The PBIR report format is still a preview; if a single visual fails to load, delete it and
> recreate it from the field wells in the table above — the model and measures are unaffected.
