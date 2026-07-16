-- Payment terms per shop: bills should be paid within this many days of the sale.
ALTER TABLE customers ADD COLUMN credit_days INTEGER NOT NULL DEFAULT 15;
