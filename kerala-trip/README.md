# Kerala Trip Companion

A single-file, offline-capable web app for a Switzerland → Kerala trip (13 Jul – 5 Aug 2026): daily log, day planner with automatic carry-over, voice capture, smart categorization, take-home lists, people tracker, curated monsoon-season place guide, and a copyable daily briefing.

## Use it

Open `index.html` in any modern browser — that's it. No build, no server, no dependencies. All data is stored in the browser's `localStorage`.

- **On your phone**: host the file anywhere (GitHub Pages works) or open it locally, then "Add to Home Screen" for an app-like experience.
- **Voice capture** uses the Web Speech API — works in Chrome and Safari; supports English (India), Malayalam, English (UK) and Swiss German.
- **Backup / Restore** (Brief tab) exports and imports the full state as JSON — use it to move between devices, since data never leaves the browser otherwise.

## Features

| View | What it does |
|---|---|
| Today | Quick capture (type or dictate) with auto-sorting into journal / task / shopping / take-home / people; carried-over items from previous days; today's plan and journal |
| Log | The full trip, day by day — notes, plans, finished items |
| Lists | Take back to Switzerland · buy while in Kerala · follow-ups once back home |
| People | Friends and relatives with to-contact → planned → met status |
| Places | 12 curated Kerala destinations with monsoon-specific insights, plus your own additions and notes |
| Brief | A generated plain-text briefing for any day (carried over, planned, finished, journal, still to meet, still to pick up) — copy it anywhere |

Trip dates are editable in the Brief tab; the day counter, carry-over and countdown all follow them.
