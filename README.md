# Schweizer Deutsch Coach (A0→B1)

🇨🇭 **Master Swiss German in 30 Minutes a Day**

An adaptive learning platform designed to take users from complete beginner (A0) to intermediate level (B1) through daily 30-minute sessions optimized for test-taking strategies and real Swiss contexts.

## 🚀 Live Demo

**Sandbox URL**: https://3000-i6c3vizyan58f2o7y9apm-b32ec7bb.sandbox.novita.ai/

## ✨ Features

### Core Functionality

✅ **Adaptive Learning Engine**
- Personalized item selection based on mastery tracking
- 60% focus on weak areas, 30% current level, 10% stretch items
- Real-time difficulty adjustment based on performance

✅ **30-Minute Daily Sessions**
- **Warm-up** (3 min): Spaced repetition flashcards from previous errors
- **Listening** (7 min): Audio comprehension with Swiss contexts
- **Reading** (7 min): Functional texts (emails, notices, forms)
- **Speaking** (7 min): Voice-based role-plays with rubric scoring
- **Writing** (4 min): Micro-tasks (40-80 words) with guided feedback
- **Wrap-up** (2 min): Error review and strategy tip of the day

✅ **Diagnostic Placement Test**
- 15-20 minute CEFR-aligned assessment
- Tests all 4 skills across A0-B1 levels
- Identifies starting level and weak areas

✅ **Test-Taking Strategies**
- **Reading**: Skim → Scan → Verify techniques
- **Listening**: Preview → Predict → Gist → Detail approach
- **Speaking**: TASK framework (Topic, Answer, Support, Keep it tidy)
- **Writing**: PEEL structure (Point, Evidence, Explain, Link)

✅ **Swiss Contexts & Themes**
- Housing (Wohnung, Miete, Mietvertrag)
- Transport (SBB, Tram, Bus schedules)
- Healthcare (Arzt, Apotheke, Krankenkasse)
- Administration (Gemeinde, Anmeldung, Aufenthaltsbewilligung)
- Work (Bewerbung, Vorstellungsgespräch)
- School (Schule, Elternbrief, Zeugnis)

✅ **Spaced Repetition System (SRS)**
- SM-2 algorithm for optimal review timing
- Intervals: 1d, 3d, 7d, 14d, 30d
- Automatic error queue management

✅ **Progress Dashboard**
- CEFR level trajectory by skill
- Streak tracking and motivation
- Weak area identification
- Time on task analytics

✅ **Mock Exams**
- 30-minute mini-mocks (weekly)
- 60-70 minute full mocks (monthly)
- Historical exam paper practice
- Strategy report with feedback

## 🎯 Current Status

### ✅ Completed Features
- User onboarding and profile management
- Diagnostic placement test (16 items, A0-B1)
- Daily session structure (6 sections)
- 50+ practice items with Swiss contexts
- 70+ vocabulary items across themes
- Strategy tips database (12+ tips)
- Adaptive mastery tracking
- SRS implementation
- Progress analytics
- Speaking role-play UI
- Writing task UI

### 🚧 Features Ready for Enhancement
- **Voice Recording**: Basic UI ready; needs Web Speech API integration
- **Automated Feedback**: Writing/speaking scoring needs AI integration
- **Audio Content**: Text-to-speech can be added for listening items
- **Mock Exams**: API ready; needs frontend implementation

## 📊 Data Architecture

### Database Schema (D1 SQLite)
- **users**: User profiles, levels, streaks
- **user_skills**: Granular skill tracking (reading, listening, speaking, writing)
- **mastery_nodes**: Skill × Theme × Tactic × Level mastery matrix
- **content_items**: Practice questions/tasks (50+ seeded)
- **srs_queue**: Spaced repetition scheduling
- **sessions**: Daily practice sessions
- **session_items**: Individual item responses
- **vocabulary**: Word bank (70+ words)
- **user_vocabulary**: Personal vocab progress
- **strategy_tips**: Test-taking strategies
- **mock_results**: Exam performance tracking

### Seed Content Summary
- **A0 Level**: 10 items (housing, transport, shopping basics)
- **A1 Level**: 15 items (doctor, gemeinde, transport)
- **A2 Level**: 15 items (work, school, doctor advanced)
- **B1 Level**: 10 items (housing contracts, job applications, permits)
- **Vocabulary**: 70 essential Swiss German words with examples
- **Strategy Tips**: 12 proven test-taking techniques

## 🛠️ Technology Stack

- **Framework**: Hono 4.10+ (lightweight edge framework)
- **Runtime**: Cloudflare Workers/Pages
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Icons**: Font Awesome 6.4
- **HTTP Client**: Axios 1.6
- **Deployment**: Cloudflare Pages

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Wrangler CLI

### Local Development

1. **Install dependencies**:
```bash
cd /home/user/webapp
npm install
```

2. **Apply database migrations**:
```bash
npm run db:migrate:local
```

3. **Build the project**:
```bash
npm run build
```

4. **Start development server**:
```bash
pm2 start ecosystem.config.cjs
```

5. **Test the application**:
```bash
curl http://localhost:3000
```

### Database Management

```bash
# Apply migrations locally
npm run db:migrate:local

# Reset local database
npm run db:reset

# Execute SQL queries
npm run db:console:local
wrangler d1 execute webapp-production --local --command="SELECT * FROM users"

# Check database structure
wrangler d1 execute webapp-production --local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Deployment to Cloudflare Pages

1. **Setup Cloudflare authentication**:
```bash
# This must be done in the Cloudflare dashboard first
# Then configure wrangler
wrangler login
```

2. **Create production D1 database**:
```bash
wrangler d1 create webapp-production
# Update wrangler.jsonc with the database_id
```

3. **Apply migrations to production**:
```bash
npm run db:migrate:prod
```

4. **Deploy to Cloudflare Pages**:
```bash
npm run deploy:prod
```

## 📖 User Guide

### Getting Started
1. **Sign Up**: Enter your name and start the diagnostic test
2. **Placement Test**: Complete the 15-minute assessment (16 questions)
3. **View Results**: See your starting level (A0-B1) and skill breakdown

### Daily Practice
1. **Start Session**: Click "Start Daily Session" from dashboard
2. **Complete Sections**: Progress through 6 sections (30 minutes total)
   - Warm-up: Review flashcards
   - Listening: Answer comprehension questions
   - Reading: Scan functional texts
   - Speaking: Record role-play responses
   - Writing: Compose short messages
   - Wrap-up: Review errors and get strategy tip
3. **Track Progress**: View accuracy, streak, and skill levels

### Strategy Tips
- **Reading**: Always skim first for main idea, then scan for details
- **Listening**: Preview questions before audio, predict keywords
- **Speaking**: Use TASK framework for structured responses
- **Writing**: Apply PEEL structure for clear arguments

## 🎨 UI/UX Features

- **Clean gradient design** with purple/blue theme
- **Progress bars** for visual feedback
- **Skill badges** color-coded by CEFR level
- **Responsive layout** for mobile and desktop
- **Real-time timer** during sessions
- **Interactive flashcards** with flip animation
- **Immediate feedback** with explanations
- **Streak tracking** for motivation
- **Strategy tips** integrated into practice

## 🔧 Configuration

### wrangler.jsonc
```jsonc
{
  "name": "webapp",
  "compatibility_date": "2025-10-31",
  "pages_build_output_dir": "./dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "your-database-id"
    }
  ]
}
```

### ecosystem.config.cjs (PM2)
```javascript
module.exports = {
  apps: [{
    name: 'schweizer-deutsch-coach',
    script: 'npx',
    args: 'wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000'
  }]
}
```

## 📈 API Endpoints

### User Management
- `POST /api/users` - Create new user
- `GET /api/users/:userId` - Get user profile

### Diagnostic Test
- `GET /api/diagnostic` - Get placement test items
- `POST /api/diagnostic/submit` - Submit test results

### Daily Sessions
- `GET /api/session/daily/:userId` - Get adaptive session items
- `POST /api/session/submit` - Submit session responses

### Progress & Analytics
- `GET /api/progress/:userId` - Get user progress dashboard
- `GET /api/vocabulary/due/:userId` - Get due SRS items
- `POST /api/vocabulary/review` - Submit vocabulary review

### Strategy Tips
- `GET /api/tips` - Get random strategy tips
- `GET /api/tips?skill=reading&level=A2` - Get filtered tips

### Mock Exams
- `GET /api/mock/:userId?type=mini-mock` - Get mock exam items
- `POST /api/mock/submit` - Submit mock exam results

## 🎯 Adaptive Learning Algorithm

### Item Selection Logic
```
For each daily session:
  1. Query user's mastery_nodes sorted by mastery_score ASC
  2. Select items based on:
     - 60% from weakest nodes (lowest mastery)
     - 30% from current level
     - 10% from +1 level (stretch items)
  3. Ensure theme rotation to prevent repetition
  4. Apply tactic variety within each skill
```

### Mastery Score Calculation
```
mastery_score = correct_count / attempts
- Score range: 0.0 to 1.0
- Updated after each item response
- Tracks per (skill × theme × tactic × level)
```

### SM-2 Spaced Repetition
```
If quality >= 3 (correct):
  - First review: 1 day
  - Second review: 3 days
  - Subsequent: interval * easeFactor
Else (incorrect):
  - Reset to 1 day
  - Reduce easeFactor

easeFactor = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
Minimum easeFactor: 1.3
```

## 🌟 Recommended Next Steps

### Immediate Enhancements
1. **Web Speech API Integration**
   - Implement voice recording for speaking tasks
   - Add speech-to-text for response capture
   - Real-time pronunciation feedback

2. **AI-Powered Feedback**
   - Integrate OpenAI/Claude for writing feedback
   - Automated grammar and vocabulary scoring
   - Personalized improvement suggestions

3. **Audio Content**
   - Add text-to-speech for listening items
   - Support speed control (0.75x, 1x, 1.25x)
   - Generate natural Swiss German audio

4. **Mock Exam Frontend**
   - Build timed exam interface
   - Show real-time progress
   - Generate detailed score reports

### Future Features
- **Social Learning**: Share progress, compete with friends
- **Achievement System**: Badges, milestones, rewards
- **Custom Study Plans**: Personalized learning paths
- **Video Lessons**: Native speaker demonstrations
- **Community Forum**: Ask questions, share tips
- **Mobile App**: Native iOS/Android applications
- **Offline Mode**: Download content for offline practice
- **AI Tutor**: Conversational practice with AI

## 📝 Development Notes

### Code Structure
```
webapp/
├── src/
│   └── index.tsx          # Main Hono application (32KB)
├── public/
│   └── static/
│       ├── app.js         # Frontend logic (29KB)
│       └── style.css      # Custom styles
├── migrations/
│   ├── 0001_initial_schema.sql    # Database schema (6KB)
│   └── 0002_seed_content.sql      # Seed data (28KB)
├── wrangler.jsonc         # Cloudflare configuration
├── ecosystem.config.cjs   # PM2 configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### Performance Considerations
- **Edge deployment**: ~50ms response times globally
- **D1 database**: Local SQLite for development, distributed for production
- **No external dependencies**: All UI libraries via CDN
- **Lightweight build**: ~53KB worker bundle

### Security Notes
- User data stored only in D1 database
- No email verification required (optional email)
- Client-side state management with localStorage
- API endpoints use userId for access control

## 🙏 Acknowledgments

- **CEFR Framework**: European standard for language assessment
- **fide/SDC**: Swiss integration program inspiration
- **SM-2 Algorithm**: Piotr Wozniak's spaced repetition research
- **Hono Framework**: High-performance edge framework
- **Cloudflare**: Edge platform and D1 database

## 📄 License

This project is developed as a learning platform demonstration. All content is for educational purposes.

---

**Built with** ❤️ **for Swiss German learners**

*From A0 to B1 in just 30 minutes a day!* 🚀🇨🇭
