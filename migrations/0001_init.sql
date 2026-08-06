-- Standing — initial schema.
--
-- Written as portable SQL (no D1/SQLite-only syntax beyond the types) so this
-- can move to Postgres later without a rewrite. Dates are 'YYYY-MM-DD' strings
-- in the user's local timezone; *_at columns are ISO-8601 UTC.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE profiles (
  user_id           TEXT PRIMARY KEY REFERENCES users(id),
  display_name      TEXT,
  sex               TEXT NOT NULL DEFAULT 'unspecified',
  birth_date        TEXT,
  height_cm         REAL,
  activity          TEXT NOT NULL DEFAULT 'light',
  goal              TEXT NOT NULL DEFAULT 'maintain',
  rate_pct_per_week REAL NOT NULL DEFAULT 0.5,
  protein_g_per_kg  REAL,
  fat_pct_of_energy REAL,
  timezone          TEXT NOT NULL DEFAULT 'Europe/Zurich',
  -- Off by default and deliberately so: eating back wearable calorie estimates
  -- is a well-known way to stall. The user opts in with the reasoning in view.
  use_active_energy INTEGER NOT NULL DEFAULT 0,
  onboarded_at      TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

-- Manual target overrides. Any NULL column falls back to the calculated value,
-- so the recommendation is always available to show alongside.
CREATE TABLE target_overrides (
  user_id       TEXT PRIMARY KEY REFERENCES users(id),
  calories      REAL,
  protein_g     REAL,
  carbs_g       REAL,
  fat_g         REAL,
  fibre_g       REAL,
  added_sugar_g REAL,
  sat_fat_g     REAL,
  sodium_mg     REAL,
  water_ml      REAL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE weights (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  date       TEXT NOT NULL,
  weight_kg  REAL NOT NULL,
  source     TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  UNIQUE (user_id, date)
);
CREATE INDEX idx_weights_user_date ON weights(user_id, date);

-- The personal food library. This is the answer to generic databases handling
-- idli, sambar, Rösti and Zopf badly: every correction the user makes is
-- remembered here and matched first from then on.
CREATE TABLE foods (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  brand         TEXT,
  serving_label TEXT NOT NULL DEFAULT 'serving',
  serving_grams REAL,
  kcal          REAL NOT NULL DEFAULT 0,
  protein_g     REAL NOT NULL DEFAULT 0,
  carbs_g       REAL NOT NULL DEFAULT 0,
  fat_g         REAL NOT NULL DEFAULT 0,
  fibre_g       REAL NOT NULL DEFAULT 0,
  added_sugar_g REAL NOT NULL DEFAULT 0,
  sat_fat_g     REAL NOT NULL DEFAULT 0,
  sodium_mg     REAL NOT NULL DEFAULT 0,
  -- 'manual' | 'estimate_confirmed' | 'estimate'
  source        TEXT NOT NULL DEFAULT 'manual',
  -- 'measured' | 'high' | 'medium' | 'low'
  confidence    TEXT NOT NULL DEFAULT 'measured',
  times_used    INTEGER NOT NULL DEFAULT 0,
  last_used_at  TEXT,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_foods_user_name ON foods(user_id, name);
CREATE INDEX idx_foods_user_used ON foods(user_id, times_used DESC, last_used_at DESC);

CREATE TABLE entries (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  date       TEXT NOT NULL,
  eaten_at   TEXT NOT NULL,
  slot       TEXT NOT NULL DEFAULT 'snack',
  note       TEXT,
  -- 'manual' | 'repeat' | 'text' | 'photo'
  source     TEXT NOT NULL DEFAULT 'manual',
  photo_key  TEXT,
  -- Idempotency key from the client, so an offline queue replaying a request
  -- can never double-log a meal.
  client_id  TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_entries_user_date ON entries(user_id, date);

CREATE TABLE entry_items (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  food_id       TEXT REFERENCES foods(id),
  label         TEXT NOT NULL,
  qty           REAL NOT NULL DEFAULT 1,
  unit          TEXT NOT NULL DEFAULT 'serving',
  kcal          REAL NOT NULL DEFAULT 0,
  protein_g     REAL NOT NULL DEFAULT 0,
  carbs_g       REAL NOT NULL DEFAULT 0,
  fat_g         REAL NOT NULL DEFAULT 0,
  fibre_g       REAL NOT NULL DEFAULT 0,
  added_sugar_g REAL NOT NULL DEFAULT 0,
  sat_fat_g     REAL NOT NULL DEFAULT 0,
  sodium_mg     REAL NOT NULL DEFAULT 0,
  -- Whether these numbers were estimated rather than read off a label, and how
  -- confident the estimate is. Shown in the UI; never presented as measured.
  estimated     INTEGER NOT NULL DEFAULT 0,
  confidence    TEXT NOT NULL DEFAULT 'measured',
  -- Set once the user has adjusted an estimate by hand.
  edited        INTEGER NOT NULL DEFAULT 0,
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_entry_items_entry ON entry_items(entry_id);

CREATE TABLE water_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  date       TEXT NOT NULL,
  ml         REAL NOT NULL,
  client_id  TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_water_user_date ON water_log(user_id, date);
