-- Unique, stable item number for every catalog item. ADDITIVE ONLY: adds a new
-- column and fills it for existing rows (name/size/prices are untouched — this
-- only initializes the new derived field). Numbers run 1..N in catalog order
-- (by name, then id); new items get the next number in the API.

ALTER TABLE products ADD COLUMN item_code INTEGER NOT NULL DEFAULT 0;

UPDATE products SET item_code = (
  SELECT COUNT(*) FROM products p2
  WHERE p2.name COLLATE NOCASE < products.name COLLATE NOCASE
     OR (p2.name COLLATE NOCASE = products.name COLLATE NOCASE AND p2.id <= products.id)
) WHERE item_code = 0;
