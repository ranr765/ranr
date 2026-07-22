-- Inbox notes get a kind: 'sale' (things a shop asked for → becomes an order)
-- or 'purchase' (things to buy from a vendor → becomes a purchase).
-- ADDITIVE ONLY: new column, existing notes default to 'sale'.

ALTER TABLE notes ADD COLUMN kind TEXT NOT NULL DEFAULT 'sale';
