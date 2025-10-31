-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  current_level TEXT DEFAULT 'A0',
  target_level TEXT DEFAULT 'B1',
  daily_goal_minutes INTEGER DEFAULT 30,
  streak_days INTEGER DEFAULT 0,
  last_session_date TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User skill levels (granular tracking per skill)
CREATE TABLE IF NOT EXISTS user_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  skill TEXT NOT NULL, -- 'reading', 'listening', 'speaking', 'writing'
  level TEXT NOT NULL, -- 'A0', 'A1', 'A2', 'B1'
  mastery_score REAL DEFAULT 0.0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, skill)
);

-- Mastery nodes (granular skill × theme × tactic tracking)
CREATE TABLE IF NOT EXISTS mastery_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  skill TEXT NOT NULL, -- 'reading', 'listening', 'speaking', 'writing'
  theme TEXT NOT NULL, -- 'housing', 'school', 'doctor', 'shopping', 'transport', 'gemeinde', 'work', 'leisure'
  tactic TEXT NOT NULL, -- 'scan', 'skim', 'inference', 'paraphrase', 'role-play', 'detail', 'gist', 'predict'
  level TEXT NOT NULL, -- 'A0', 'A1', 'A2', 'B1'
  mastery_score REAL DEFAULT 0.0, -- 0.0 to 1.0
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_practiced DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, skill, theme, tactic, level)
);

-- Content items (practice questions/tasks)
CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'reading', 'listening', 'speaking', 'writing', 'vocab'
  level TEXT NOT NULL, -- 'A0', 'A1', 'A2', 'B1'
  theme TEXT NOT NULL,
  tactic TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- JSON: {text, audio_url, question, options, correct_answer, explanation, etc}
  difficulty REAL DEFAULT 0.5, -- 0.0 to 1.0
  time_estimate_seconds INTEGER DEFAULT 300,
  source TEXT DEFAULT 'generated', -- 'historical', 'generated', 'custom'
  tags TEXT, -- JSON array of additional tags
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SRS (Spaced Repetition System) queue
CREATE TABLE IF NOT EXISTS srs_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'vocab', 'error_pattern', 'content_item'
  item_id INTEGER NOT NULL, -- references content_items.id or vocab.id
  due_date DATE NOT NULL,
  interval_days INTEGER DEFAULT 1, -- SM-2 intervals: 1, 3, 7, 14, 30
  easiness_factor REAL DEFAULT 2.5, -- SM-2 ease factor
  repetitions INTEGER DEFAULT 0,
  last_reviewed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions (daily practice sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_type TEXT DEFAULT 'daily', -- 'daily', 'mini-mock', 'full-mock', 'diagnostic'
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  duration_seconds INTEGER,
  items_completed INTEGER DEFAULT 0,
  accuracy REAL DEFAULT 0.0,
  session_data TEXT, -- JSON: detailed breakdown by skill
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Session items (individual responses within a session)
CREATE TABLE IF NOT EXISTS session_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  content_item_id INTEGER NOT NULL,
  user_response TEXT, -- JSON: response data
  is_correct INTEGER,
  time_spent_seconds INTEGER,
  feedback TEXT, -- JSON: automated feedback
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (content_item_id) REFERENCES content_items(id)
);

-- Mock results
CREATE TABLE IF NOT EXISTS mock_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  mock_type TEXT NOT NULL, -- 'mini-mock', 'full-mock'
  level TEXT NOT NULL, -- target level
  session_id INTEGER NOT NULL,
  reading_score REAL,
  listening_score REAL,
  speaking_score REAL,
  writing_score REAL,
  overall_score REAL,
  passed INTEGER DEFAULT 0,
  strategy_report TEXT, -- JSON: detailed analysis
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Vocabulary bank
CREATE TABLE IF NOT EXISTS vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  level TEXT NOT NULL,
  theme TEXT NOT NULL,
  example_sentence TEXT,
  audio_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User vocabulary progress
CREATE TABLE IF NOT EXISTS user_vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  vocab_id INTEGER NOT NULL,
  mastery_level INTEGER DEFAULT 0, -- 0=new, 1=learning, 2=known, 3=mastered
  times_reviewed INTEGER DEFAULT 0,
  last_reviewed DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (vocab_id) REFERENCES vocabulary(id),
  UNIQUE(user_id, vocab_id)
);

-- Strategy tips
CREATE TABLE IF NOT EXISTS strategy_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill TEXT NOT NULL,
  level TEXT NOT NULL,
  tactic TEXT NOT NULL,
  tip_title TEXT NOT NULL,
  tip_content TEXT NOT NULL,
  example TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mastery_nodes_user ON mastery_nodes(user_id, mastery_score);
CREATE INDEX IF NOT EXISTS idx_srs_queue_due ON srs_queue(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_content_items_level ON content_items(level, type, theme);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_user_vocab_user ON user_vocabulary(user_id, mastery_level);
