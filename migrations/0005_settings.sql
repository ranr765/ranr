-- Key/value settings, e.g. the owner's payment QR image (data URL) and UPI ID
-- shown on invoice images.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
