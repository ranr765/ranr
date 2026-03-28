# Email Scheduler - Weekly Summary

Scans your Gmail inbox for the past week's emails and generates an AI-powered summary with key events and action items using Claude.

## Setup

### 1. Install dependencies

```bash
cd email-scheduler
npm install
```

### 2. Set up Gmail API credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Enable the **Gmail API** under "APIs & Services > Library"
4. Create **OAuth 2.0 credentials** (Application type: "Desktop app")
5. Download the JSON and save it as `email-scheduler/credentials.json`

### 3. Authenticate with Gmail

```bash
npm run setup
```

This opens an OAuth flow — authorize with your Google account to grant read-only access to Gmail.

### 4. Set your Anthropic API key

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Usage

### One-time run

```bash
npm start
```

This fetches emails from the last 7 days, generates a summary, and saves the report to `reports/`.

### Scheduled (cron)

```bash
npm run schedule
```

Runs automatically every Monday at 8:00 AM (configurable via `EMAIL_CRON_SCHEDULE`).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_LOOKBACK_DAYS` | `7` | Days of email history to scan |
| `EMAIL_MAX_RESULTS` | `100` | Maximum emails to fetch |
| `EMAIL_FETCH_BODY_COUNT` | `30` | Emails to fetch full body content for |
| `EMAIL_CRON_SCHEDULE` | `0 8 * * 1` | Cron schedule (default: Monday 8 AM) |
| `ANTHROPIC_API_KEY` | — | Required. Your Anthropic API key |

## Output

Reports are saved in `reports/` as both `.txt` (formatted) and `.json` (structured) files:

- `reports/email-summary-2026-03-28.txt` — Human-readable report
- `reports/email-summary-2026-03-28.json` — Structured JSON with events and action items

### Sample Report Structure

```
============================================================
  WEEKLY EMAIL SUMMARY REPORT
  Generated: 3/28/2026, 8:00:00 AM
============================================================

## Overview
<Executive summary of the week's email activity>

## Key Events
1. [MEETING] Team standup rescheduled
   Moved from Tuesday to Wednesday at 10 AM
   Date: March 25, 2026

## Action Items
1. [!!!] Review Q1 budget proposal
   Deadline: March 30, 2026
   Source: finance@company.com
```
