# Distribution Request Form — Microsoft Forms Setup Guide

## Overview
This guide provides the exact configuration to create the Distribution Request Form in Microsoft Forms. Since Microsoft Forms has limitations (no auto-calculated fields, no side-by-side layout), this guide also includes workarounds.

> **Note**: Microsoft Forms does not support auto-calculated fields natively. For calculated fields (Total Assets, Total Equity, etc.), you have two options:
> 1. Use **Microsoft Forms + Power Automate** to calculate after submission
> 2. Use **Microsoft Lists** or **SharePoint** with calculated columns
> 3. Use the **web form** at `/distribution-form` route (included in this repo) which has live auto-calculations

---

## Microsoft Forms Configuration

### Section 1: Submitter Information

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 1 | Name of submitter | Text | Yes | Subtitle: "Country Head of Finance" |
| 2 | Company Code | Text | Yes | Subtitle: "SAP company code" |
| 3 | Company Name | Text | Yes | Subtitle: "Full registered legal name" |
| 4 | Country | Choice (Dropdown) | Yes | Add all countries |
| 5 | Local Currency | Choice (Dropdown) | Yes | AED, ARS, AUD, BRL, CAD, CHF, CLP, CNY, COP, CZK, DKK, EGP, EUR, GBP, HKD, HUF, IDR, ILS, INR, JPY, KES, KRW, MAD, MXN, MYR, NGN, NOK, NZD, PEN, PHP, PKR, PLN, QAR, RON, RUB, SAR, SEK, SGD, THB, TRY, TWD, USD, VND, ZAR |

### Section 2: Parent Company Information

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 6 | Parent Company Code 1 | Text | No | |
| 7 | Parent Company Name 1 | Text | No | Subtitle: "Full registered legal name" |
| 8 | Country (Parent 1) | Choice (Dropdown) | No | Same country list |
| 9 | Parent Company Code 2 | Text | No | |
| 10 | Parent Company Name 2 | Text | No | Subtitle: "Full registered legal name" |
| 11 | Country (Parent 2) | Choice (Dropdown) | No | Same country list |
| 12 | Parent Company Code 3 | Text | No | |
| 13 | Parent Company Name 3 | Text | No | Subtitle: "Full registered legal name" |
| 14 | Country (Parent 3) | Choice (Dropdown) | No | Same country list |

### Section 3: Proposal

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 15 | Maximum Theoretical Payout | Text (Number) | Yes | Subtitle: "Per statutory accounts and local law. Enter in local currency." |
| 16 | Total Proposed Amount | Text (Number) | Yes | Subtitle: "Enter in local currency" |
| 17 | Proposed Action Type | Choice (Dropdown) | Yes | Dividend, Capital Reduction, In-kind |
| 18 | Rationale / Justification | Long Text | Yes | Subtitle: "Why this distribution, how is it linked to group capital allocation strategy" |
| 19 | If In-Kind, provide details of assets to be distributed | Long Text | No | |

### Section 4: Payment Tranches

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 20 | *(Section header)* | Section | — | Subtitle: "Combined tranches should equal to total proposed amount" |
| 21 | Proposed 1st Payment Date | Date | No | |
| 22 | Proposed 1st Payment Amount | Text (Number) | No | Subtitle: "Local currency amount" |
| 23 | Proposed 2nd Payment Date | Date | No | |
| 24 | Proposed 2nd Payment Amount | Text (Number) | No | Subtitle: "Local currency amount" |

### Section 5: Financials — Prior Year

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 25 | *(Section header)* | Section | — | Title: "Financials — Prior Year" |
| 26 | Balance Sheet Date (Prior Year) | Date | No | Subtitle: "Date of the accounts used" |
| 27 | Reporting basis (Prior Year) | Choice (Dropdown) | No | Local Statutory GAAP, IFRS, Both |
| 28 | Are these accounts audited? (Prior Year) | Choice | No | Yes, No |
| **Assets** | | | | |
| 29 | Cash & Cash Equivalents (Prior Year) | Text (Number) | No | |
| 30 | Intercompany Loan Receivables (Prior Year) | Text (Number) | No | |
| 31 | Other Current Assets (Prior Year) | Text (Number) | No | |
| 32 | Fixed Assets (Prior Year) | Text (Number) | No | |
| 33 | Intangible Assets (Prior Year) | Text (Number) | No | |
| 34 | Other Non-Current Assets (Prior Year) | Text (Number) | No | |
| 35 | Total Assets (Prior Year) | Text (Number) | No | Subtitle: "Auto-calculated in Excel. Enter sum of fields 29–34." |
| **Liabilities** | | | | |
| 36 | Bank Debt — short-term (Prior Year) | Text (Number) | No | Subtitle: "Split from original single line" |
| 37 | Bank Debt — long-term (Prior Year) | Text (Number) | No | |
| 38 | Intercompany Loan Payables (Prior Year) | Text (Number) | No | |
| 39 | Other Liabilities (Prior Year) | Text (Number) | No | |
| 40 | Contingent Liabilities / Guarantees Outstanding (Prior Year) | Text (Number) | No | |
| **Shareholders' Equity** | | | | |
| 41 | Share Capital (Prior Year) | Text (Number) | No | Subtitle: "Full breakdown required" |
| 42 | Share Premium (Prior Year) | Text (Number) | No | |
| 43 | Legal / Statutory Reserves (Prior Year) | Text (Number) | No | Subtitle: "Non-distributable" |
| 44 | Retained Earnings (Prior Year) | Text (Number) | No | |
| 45 | Other Reserves — specify (Prior Year) | Text (Number) | No | Subtitle: "e.g. revaluation, translation" |
| 46 | Total Shareholders' Equity (Prior Year) | Text (Number) | No | Subtitle: "Auto-calculated. Enter sum of fields 41–45." |
| 47 | Total Liabilities & Equity (Prior Year) | Text (Number) | No | Subtitle: "Auto-calculated" |
| **Other** | | | | |
| 48 | Distributable Reserves per Local Statutory Accounts (Prior Year) | Text (Number) | No | Subtitle: "This is the legal ceiling — explain basis in comments" |
| 49 | Basis for Distributable Reserves Calculation (Prior Year) | Long Text | No | Subtitle: "Reference to applicable local company law" |
| 50 | Net Working Capital (Prior Year) | Text (Number) | No | Subtitle: "Auto-calculated: Current assets minus current liabilities" |
| 51 | Minimum Cash Balance Required for Operations (Prior Year) | Text (Number) | No | Subtitle: "As estimated by Country Finance" |

### Section 6: Financials — Current Year

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 52 | *(Section header)* | Section | — | Title: "Financials — Current Year" |
| 53 | Balance Sheet Date (Current Year) | Date | No | Subtitle: "Date of the accounts used" |
| 54 | Reporting basis (Current Year) | Choice (Dropdown) | No | Local Statutory GAAP, IFRS, Both |
| 55 | Are these accounts audited? (Current Year) | Choice | No | Yes, No |
| **Assets** | | | | |
| 56 | Cash & Cash Equivalents (Current Year) | Text (Number) | No | |
| 57 | Intercompany Loan Receivables (Current Year) | Text (Number) | No | |
| 58 | Other Current Assets (Current Year) | Text (Number) | No | |
| 59 | Fixed Assets (Current Year) | Text (Number) | No | |
| 60 | Intangible Assets (Current Year) | Text (Number) | No | |
| 61 | Other Non-Current Assets (Current Year) | Text (Number) | No | |
| 62 | Total Assets (Current Year) | Text (Number) | No | Subtitle: "Auto-calculated in Excel. Enter sum of fields 56–61." |
| **Liabilities** | | | | |
| 63 | Bank Debt — short-term (Current Year) | Text (Number) | No | Subtitle: "Split from original single line" |
| 64 | Bank Debt — long-term (Current Year) | Text (Number) | No | |
| 65 | Intercompany Loan Payables (Current Year) | Text (Number) | No | |
| 66 | Other Liabilities (Current Year) | Text (Number) | No | |
| 67 | Contingent Liabilities / Guarantees Outstanding (Current Year) | Text (Number) | No | |
| **Shareholders' Equity** | | | | |
| 68 | Share Capital (Current Year) | Text (Number) | No | Subtitle: "Full breakdown required" |
| 69 | Share Premium (Current Year) | Text (Number) | No | |
| 70 | Legal / Statutory Reserves (Current Year) | Text (Number) | No | Subtitle: "Non-distributable" |
| 71 | Retained Earnings (Current Year) | Text (Number) | No | |
| 72 | Other Reserves — specify (Current Year) | Text (Number) | No | Subtitle: "e.g. revaluation, translation" |
| 73 | Total Shareholders' Equity (Current Year) | Text (Number) | No | Subtitle: "Auto-calculated. Enter sum of fields 68–72." |
| 74 | Total Liabilities & Equity (Current Year) | Text (Number) | No | Subtitle: "Auto-calculated" |
| **Other** | | | | |
| 75 | Distributable Reserves per Local Statutory Accounts (Current Year) | Text (Number) | No | Subtitle: "This is the legal ceiling — explain basis in comments" |
| 76 | Basis for Distributable Reserves Calculation (Current Year) | Long Text | No | Subtitle: "Reference to applicable local company law" |
| 77 | Net Working Capital (Current Year) | Text (Number) | No | Subtitle: "Auto-calculated: Current assets minus current liabilities" |
| 78 | Minimum Cash Balance Required for Operations (Current Year) | Text (Number) | No | Subtitle: "As estimated by Country Finance" |

### Section 7: P&L Forecast

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 79 | P&L Forecast Period | Choice (Dropdown) | No | Full-Year Forecast |
| 80 | Net Profit / (Loss) | Text (Number) | No | Subtitle: "Local currency amount" |

### Section 8: Free Cash Flow Build

| # | Question Text | Type | Required | Options / Notes |
|---|---|---|---|---|
| 81 | Net Operational Cash Flow | Text (Number) | No | Subtitle: "Total cash inflow from operations less total cash outflow from operations" |
| 82 | Net Non-Operational Cash Flow | Text (Number) | No | Subtitle: "Exclude dividends" |
| 83 | Net Investments (Capex, acquisitions, disposals) | Text (Number) | No | Subtitle: "Local currency amount" |
| 84 | Free Cash Flow | Text (Number) | No | Subtitle: "Auto-calculated: sum of fields 81–83" |
| 85 | Scheduled Debt Service Obligations | Text (Number) | No | Subtitle: "Principal repayments on bank and IC loans falling due within 12 months" |

---

## How to Create in Microsoft Forms

1. Go to **forms.office.com** and sign in
2. Click **+ New Form**
3. Title: **"Distribution Request Form"**
4. Description: **"Complete all sections. Fields marked as auto-calculated should be computed manually or will be calculated in the connected Excel workbook."**
5. For each section above, click **+ Add new** → **Section** to create section headers
6. For each question, click **+ Add new** and select the appropriate type:
   - **Text** → for text and number inputs (enable "Number" restriction for currency amounts)
   - **Choice** → for dropdowns (toggle "Drop-down" in settings)
   - **Date** → for date fields
7. Add subtitles by clicking the question and entering guidance text in the subtitle field
8. Mark required fields by toggling the **Required** switch

## Auto-Calculation with Power Automate

Since Microsoft Forms cannot auto-calculate, set up a Power Automate flow:
1. Trigger: **When a new response is submitted** (Microsoft Forms)
2. Action: **Get response details**
3. Action: **Compose** — Calculate Total Assets, Total Equity, NWC, FCF
4. Action: **Update Excel row** or **Send email** with calculated values

## Alternative: Web Form with Auto-Calculations

The web form at `/distribution-form` in this repository provides:
- Live auto-calculated fields (Total Assets, Total Equity, NWC, Free Cash Flow)
- Side-by-side Prior Year / Current Year financials layout
- Microsoft Forms-inspired purple theme styling
- All field validations and guidance text
