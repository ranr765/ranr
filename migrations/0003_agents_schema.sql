-- Agents table: AI-powered tutoring agents for the learning platform
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'writing_feedback', 'speaking_coach', 'reading_tutor', 'listening_tutor', 'conversation'
  description TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'error'
  model TEXT DEFAULT 'claude-sonnet-4-20250514', -- AI model powering the agent
  skill TEXT, -- 'reading', 'listening', 'speaking', 'writing', or NULL for general
  levels TEXT DEFAULT '["A0","A1","A2","B1"]', -- JSON array of supported CEFR levels
  config TEXT, -- JSON: agent-specific configuration (system prompt, rubric, etc.)
  total_interactions INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0.0,
  last_active_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent interactions log
CREATE TABLE IF NOT EXISTS agent_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_id INTEGER,
  input_text TEXT,
  output_text TEXT,
  rating INTEGER, -- 1-5 user rating
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent ON agent_interactions(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_user ON agent_interactions(user_id, created_at);

-- Seed default agents
INSERT OR IGNORE INTO agents (id, name, type, description, status, skill, config) VALUES
  ('agent-writing-feedback', 'Writing Coach', 'writing_feedback', 'Provides detailed feedback on written Swiss German responses, checking grammar, vocabulary, and structure.', 'active', 'writing', '{"rubric":["task_completion","vocabulary","grammar","coherence"],"max_tokens":500}'),
  ('agent-speaking-coach', 'Speaking Coach', 'speaking_coach', 'Evaluates spoken responses for fluency, pronunciation, range, and task completion.', 'active', 'speaking', '{"rubric":["fluency","range","accuracy","task_completion"],"max_tokens":400}'),
  ('agent-reading-tutor', 'Reading Tutor', 'reading_tutor', 'Guides learners through reading comprehension with hints, explanations, and strategy coaching.', 'active', 'reading', '{"strategies":["scan","skim","inference","detail"],"max_tokens":300}'),
  ('agent-listening-tutor', 'Listening Tutor', 'listening_tutor', 'Helps learners improve listening skills with targeted feedback and comprehension strategies.', 'active', 'listening', '{"strategies":["gist","detail","predict","paraphrase"],"max_tokens":300}'),
  ('agent-conversation', 'Swiss German Tutor', 'conversation', 'Interactive conversational practice partner for real-world Swiss German scenarios.', 'inactive', NULL, '{"themes":["housing","doctor","shopping","transport","gemeinde","work"],"max_turns":20}');
