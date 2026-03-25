# Power BI Dashboard - Schweizer Deutsch Coach

## Overview

This Power BI project provides a 5-page analytics dashboard for the Schweizer Deutsch Coach learning platform:

| Page | Description |
|------|-------------|
| **Executive Overview** | KPIs, learner distribution, session types, leaderboard |
| **Learner Progress** | Skill mastery scores, CEFR levels, theme x skill heatmap |
| **Session Analytics** | Session trends, completion rates, accuracy by type |
| **Vocabulary & SRS** | Vocab mastery distribution, SRS queue health, review activity |
| **Mock Exam Results** | Pass rates, score breakdowns, trend analysis |

## Prerequisites

- **Power BI Desktop** (October 2023 or later for PBIP format support)
- Access to the deployed Schweizer Deutsch Coach API

## Setup Instructions

### Option A: Open as Power BI Project (Recommended)

1. Open Power BI Desktop
2. Go to **File > Open report > Browse** and select `SwissGermanCoach.pbip`
3. When prompted, set the `API_BASE_URL` parameter to your deployed API URL (e.g., `https://your-app.pages.dev`)
4. Click **Refresh** to load data from the API

### Option B: Manual Setup with Web Connector

1. Open Power BI Desktop and create a new report
2. Go to **Home > Transform data > Advanced Editor**
3. For each table, use the Power Query M expressions from the semantic model
4. Replace `API_BASE_URL` with your actual API URL
5. Click **Close & Apply**

### Configuring the API URL Parameter

After opening the project:

1. Go to **Home > Transform data**
2. In the Queries pane, find `API_BASE_URL`
3. Update the value to your deployed API URL
4. Click **Close & Apply**

## API Endpoints

The dashboard connects to these analytics endpoints:

| Endpoint | Table | Description |
|----------|-------|-------------|
| `GET /api/analytics/users` | UsersOverview | User profiles with aggregated stats |
| `GET /api/analytics/skills` | SkillLevels | Per-user skill levels and mastery |
| `GET /api/analytics/sessions` | Sessions | Session history with accuracy |
| `GET /api/analytics/mastery` | MasteryNodes | Granular skill x theme x tactic mastery |
| `GET /api/analytics/vocabulary` | VocabularyProgress | Vocabulary words with learner progress |
| `GET /api/analytics/mocks` | MockResults | Mock exam scores and pass/fail |
| `GET /api/analytics/srs` | SRSHealth | Spaced repetition queue health |
| `GET /api/analytics/content` | ContentLibrary | Content usage and success rates |

All endpoints return JSON with `{ data: [...], _meta: { table, refreshed_at } }` format.

## Data Model

### Relationships

```
UsersOverview (1) ──< (many) SkillLevels
UsersOverview (1) ──< (many) Sessions
UsersOverview (1) ──< (many) MasteryNodes
UsersOverview (1) ──< (many) MockResults
UsersOverview (1) ──< (many) SRSHealth
```

### Key DAX Measures

| Measure | Table | Description |
|---------|-------|-------------|
| Total Learners | UsersOverview | Count of all registered users |
| Active Learners | UsersOverview | Users with at least 1 completed session |
| Platform Avg Accuracy | UsersOverview | Average accuracy across all users |
| Total Practice Hours | UsersOverview | Sum of all practice time in hours |
| Onboarding Rate | UsersOverview | % of users who completed diagnostic test |
| Session Completion Rate | Sessions | % of started sessions that were completed |
| Avg Session Duration | Sessions | Average session length in minutes |
| Mock Pass Rate | MockResults | % of mock exams passed |
| Mastered Vocab % | VocabularyProgress | % of vocabulary items mastered |
| Overdue Rate | SRSHealth | % of SRS items that are overdue |

## Scheduled Refresh

To set up automatic data refresh in Power BI Service:

1. Publish the report to Power BI Service
2. Go to dataset settings
3. Configure **Scheduled refresh** (recommended: every 6 hours)
4. Set up a **Gateway** if the API requires authentication

## File Structure

```
powerbi/
├── SwissGermanCoach.pbip              # Project entry point
├── SETUP.md                           # This file
├── SwissGermanCoach.SemanticModel/
│   ├── .platform                      # Fabric metadata
│   └── definition/
│       └── model.bim                  # Tabular model (tables, measures, relationships, M queries)
└── SwissGermanCoach.Report/
    ├── .platform                      # Fabric metadata
    └── definition/
        └── report.json                # Report pages, visuals, and layout
```
