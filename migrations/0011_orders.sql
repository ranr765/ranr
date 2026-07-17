-- Order book: rough orders noted when a shop asks for goods, prepared later.
-- Converting an order to a sale marks it done.
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_date TEXT NOT NULL,
  customer_id INTEGER,
  customer_name TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '',
  total_amount REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, order_date);
