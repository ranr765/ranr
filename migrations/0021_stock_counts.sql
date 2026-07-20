-- Stock registry: a physical count (stock take) sets each item's baseline on a
-- date; the running balance = latest count + purchases − sales recorded AFTER
-- that count. Re-counting anytime just inserts a newer baseline row.
-- ADDITIVE ONLY — new table, nothing existing touched.

CREATE TABLE IF NOT EXISTS stock_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  count_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_product ON stock_counts (product_id, created_at);
