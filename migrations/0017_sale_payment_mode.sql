-- Payment method on a sale: how the money came in — cash, credit (owed), or
-- cheque. ADDITIVE ONLY: new nullable column; existing rows are untouched and
-- read back as '' (the API/UI infers cash/credit from paid vs total for those).

ALTER TABLE sales ADD COLUMN payment_mode TEXT NOT NULL DEFAULT '';
