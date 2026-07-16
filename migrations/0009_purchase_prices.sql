-- Purchase (buying) rates from the notebook's first price column.
-- Like sale_price these are defaults only — the amount on each entry is editable.
ALTER TABLE products ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0;

-- LD covers
UPDATE products SET purchase_price = 182 WHERE name = 'Spice LD Cover';
UPDATE products SET purchase_price = 203 WHERE name = 'Money Gold LD Cover';
UPDATE products SET purchase_price = 200 WHERE name = 'Gulf LD Cover';
UPDATE products SET purchase_price = 40  WHERE name = 'Fine Pack LD Cover';

-- HM covers
UPDATE products SET purchase_price = 114 WHERE name = 'JM HM Cover';
UPDATE products SET purchase_price = 138 WHERE name = 'Elite HM Cover';
UPDATE products SET purchase_price = 133 WHERE name = 'Softy HM Cover';
UPDATE products SET purchase_price = 135 WHERE name = 'Zamkudi HM Cover';

-- carry bags
UPDATE products SET purchase_price = 96  WHERE name = 'Superdiamond Carry Bag';
UPDATE products SET purchase_price = 126 WHERE name = 'King Carry Bag';
UPDATE products SET purchase_price = 135 WHERE name = 'World Cup Carry Bag';
UPDATE products SET purchase_price = 97  WHERE name = 'Bio Ecowin Carry Bag';
UPDATE products SET purchase_price = 110 WHERE name = 'Palmtree Carry Bag';
UPDATE products SET purchase_price = 120 WHERE name = 'Power Carry Bag';

-- wrapping
UPDATE products SET purchase_price = 460 WHERE name = 'Cling Film' AND size = '60 mtr';
UPDATE products SET purchase_price = 380 WHERE name = 'Cling Film Normal';
UPDATE products SET purchase_price = 65  WHERE name = 'Cling Film' AND size = '100 mtr';
UPDATE products SET purchase_price = 38  WHERE name = 'Aluminium Foil';
UPDATE products SET purchase_price = 705 WHERE name = 'Onion Net';

-- plates
UPDATE products SET purchase_price = 105 WHERE name = 'VIP Plate';
UPDATE products SET purchase_price = 168 WHERE name = 'Plate' AND size = '10x12';
UPDATE products SET purchase_price = 128 WHERE name = 'Plate' AND size = '10x10';
UPDATE products SET purchase_price = 38  WHERE name = 'Plate' AND size = '6 inch';
UPDATE products SET purchase_price = 55  WHERE name = 'Plate' AND size = '8 inch';

-- cups & cutlery
UPDATE products SET purchase_price = 28  WHERE name = 'Ice Cup';
UPDATE products SET purchase_price = 38  WHERE name = 'Spoon';
UPDATE products SET purchase_price = 330 WHERE name = 'Aluminium Container' AND size = '750 ml';
UPDATE products SET purchase_price = 220 WHERE name = 'Aluminium Container' AND size = '450 ml';
UPDATE products SET purchase_price = 165 WHERE name = 'Aluminium Container' AND size = '250 ml';

-- glasses
UPDATE products SET purchase_price = 40  WHERE name = 'Paper Glass Normal' AND size = '150 ml';
UPDATE products SET purchase_price = 50  WHERE name = 'Paper Glass Normal' AND size = '200 ml';
UPDATE products SET purchase_price = 50  WHERE name = 'Paper Glass Bio' AND size = '150 ml';
UPDATE products SET purchase_price = 60  WHERE name = 'Paper Glass Bio' AND size = '200 ml';
UPDATE products SET purchase_price = 90  WHERE name = 'Juice Glass' AND size = '250 ml';
UPDATE products SET purchase_price = 100 WHERE name = 'Juice Glass' AND size = '300 ml';
UPDATE products SET purchase_price = 48  WHERE name = 'Plastic Glass';
UPDATE products SET purchase_price = 95  WHERE name = 'Plastic Glass Hard';
UPDATE products SET purchase_price = 220 WHERE name = 'Juice Glass with Lid';
UPDATE products SET purchase_price = 70  WHERE name = 'Mayonnaise Cup' AND size = '50 ml';
UPDATE products SET purchase_price = 105 WHERE name = 'Mayonnaise Cup' AND size = '100 ml';
UPDATE products SET purchase_price = 65  WHERE name = 'Plastic Container Round' AND size = '250 ml';
UPDATE products SET purchase_price = 165 WHERE name = 'Plastic Container Round' AND size = '500 ml';
UPDATE products SET purchase_price = 360 WHERE name = 'Plastic Container Round' AND size = '750 ml';
UPDATE products SET purchase_price = 360 WHERE name = 'Plastic Container Rectangle';
