-- Item catalog. sale_price is an optional default selling price (0 = not set);
-- the actual amount is always entered on the sale itself.
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT '',
  sale_price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initial catalog for Simple Serve
INSERT INTO products (name, size) VALUES
  ('Spice LD Cover', '250 gm'),
  ('Spice LD Cover', '500 gm'),
  ('Spice LD Cover', '1 kg'),
  ('Spice LD Cover', '2 kg'),
  ('Spice LD Cover', '3 kg'),
  ('Spice LD Cover', '5 kg'),
  ('Spice LD Cover', '10 kg'),
  ('Spice LD Cover', '15 kg'),
  ('Spice LD Cover', '20 kg'),
  ('Spice LD Cover', '25 kg'),
  ('Mone Gold LD Cover', '250 gm'),
  ('Mone Gold LD Cover', '500 gm'),
  ('Mone Gold LD Cover', '1 kg'),
  ('Mone Gold LD Cover', '2 kg'),
  ('Mone Gold LD Cover', '3 kg'),
  ('Mone Gold LD Cover', '5 kg'),
  ('Mone Gold LD Cover', '10 kg'),
  ('Gulf LD Cover', '10x12'),
  ('Gulf LD Cover', '10x14'),
  ('Gulf LD Cover', '12x18'),
  ('Fine Pack LD Cover', 'Triple Zero');
