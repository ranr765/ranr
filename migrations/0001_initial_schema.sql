-- CVZ Cricket Team voting app schema

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'T20',
  team_size INTEGER NOT NULL DEFAULT 11,
  finalized INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, name)
);

CREATE TABLE IF NOT EXISTS voters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(match_id, slot)
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(voter_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_players_match ON players(match_id);
CREATE INDEX IF NOT EXISTS idx_votes_match ON votes(match_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_voters_match ON voters(match_id);

-- Seed: two matches on 10 May
INSERT INTO matches (id, name, match_date, match_time, match_type, team_size) VALUES
  (1, 'Morning Match', '2026-05-10', '09:00', 'T20', 11),
  (2, 'Afternoon Match', '2026-05-10', '14:00', 'T20', 11);

-- Seed: 14 players for each match
INSERT INTO players (match_id, name, sort_order) VALUES
  (1, 'Aadil', 1),
  (1, 'Abdullah', 2),
  (1, 'Akhil', 3),
  (1, 'Amit', 4),
  (1, 'Ankush', 5),
  (1, 'Baljit', 6),
  (1, 'Harsh', 7),
  (1, 'Jithesh', 8),
  (1, 'Mirza', 9),
  (1, 'Nikmal', 10),
  (1, 'Ranjith', 11),
  (1, 'Saurabh', 12),
  (1, 'Shishir', 13),
  (1, 'Vaibhav', 14),
  (2, 'Aadil', 1),
  (2, 'Abdullah', 2),
  (2, 'Akhil', 3),
  (2, 'Amit', 4),
  (2, 'Ankush', 5),
  (2, 'Baljit', 6),
  (2, 'Harsh', 7),
  (2, 'Jithesh', 8),
  (2, 'Mirza', 9),
  (2, 'Nikmal', 10),
  (2, 'Ranjith', 11),
  (2, 'Saurabh', 12),
  (2, 'Shishir', 13),
  (2, 'Vaibhav', 14);

-- Seed: four default selector slots per match (group can rename)
INSERT INTO voters (match_id, slot, name) VALUES
  (1, 1, 'Selector 1'),
  (1, 2, 'Selector 2'),
  (1, 3, 'Selector 3'),
  (1, 4, 'Selector 4'),
  (2, 1, 'Selector 1'),
  (2, 2, 'Selector 2'),
  (2, 3, 'Selector 3'),
  (2, 4, 'Selector 4');
