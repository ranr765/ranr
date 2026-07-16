-- Price book from the shop notebook (Jan 2026 page).
-- sale_price = selling rate per kg (covers/bags are sold by weight, so in the
-- sale form quantity = kg and the total auto-fills as qty x rate).

-- fix brand spelling from the notebook: "Money Gold"
UPDATE products SET name = 'Money Gold LD Cover' WHERE name = 'Mone Gold LD Cover';

-- selling rates for the existing LD cover items
UPDATE products SET sale_price = 205 WHERE name = 'Spice LD Cover';
UPDATE products SET sale_price = 225 WHERE name = 'Money Gold LD Cover';
UPDATE products SET sale_price = 220 WHERE name = 'Gulf LD Cover';
UPDATE products SET sale_price = 50  WHERE name = 'Fine Pack LD Cover';

-- HM covers
INSERT INTO products (name, size, sale_price) VALUES
  ('JM HM Cover', '250 gm', 140),
  ('JM HM Cover', '500 gm', 140),
  ('JM HM Cover', '1 kg', 140),
  ('JM HM Cover', '2 kg', 140),
  ('JM HM Cover', '3 kg', 140),
  ('Elite HM Cover', '250 gm', 155),
  ('Elite HM Cover', '500 gm', 155),
  ('Elite HM Cover', '1 kg', 155),
  ('Elite HM Cover', '2 kg', 155),
  ('Elite HM Cover', '3 kg', 155),
  ('Elite HM Cover', '5 kg', 155),
  ('Softy HM Cover', '250 gm', 155),
  ('Softy HM Cover', '500 gm', 155),
  ('Softy HM Cover', '1 kg', 155),
  ('Softy HM Cover', '2 kg', 155),
  ('Softy HM Cover', '3 kg', 155),
  ('Softy HM Cover', '5 kg', 155),
  ('Softy HM Cover', '10 kg', 155),
  ('Zamkudi HM Cover', '1 kg', 155),
  ('Zamkudi HM Cover', '2 kg', 155),
  ('Zamkudi HM Cover', '3 kg', 155),
  ('Zamkudi HM Cover', '5 kg', 155),
  ('Zamkudi HM Cover', '10 kg', 155);

-- carry bags
INSERT INTO products (name, size, sale_price) VALUES
  ('Superdiamond Carry Bag', '10x14', 130),
  ('Superdiamond Carry Bag', '13x16', 130),
  ('Superdiamond Carry Bag', '16x20', 130),
  ('King Carry Bag', '10x14', 150),
  ('King Carry Bag', '13x16', 150),
  ('King Carry Bag', '16x20', 150),
  ('World Cup Carry Bag', '10x14', 155),
  ('World Cup Carry Bag', '13x16', 155),
  ('World Cup Carry Bag', '16x20', 155),
  ('World Cup Carry Bag', '17x23', 155),
  ('Bio Ecowin Carry Bag', '10x14', 0),
  ('Bio Ecowin Carry Bag', '13x16', 0),
  ('Bio Ecowin Carry Bag', '16x20', 0),
  ('Bio Ecowin Carry Bag', '17x23', 0),
  ('Bio Ecowin Carry Bag', '20x26', 0),
  ('Palmtree Carry Bag', '10x14', 130),
  ('Palmtree Carry Bag', '13x16', 130),
  ('Palmtree Carry Bag', '16x20', 130),
  ('Palmtree Carry Bag', '17x23', 130),
  ('Palmtree Carry Bag', '20x26', 130),
  ('Power Carry Bag', '17x23', 145),
  ('Power Carry Bag', '20x26', 145),
  ('Power Carry Bag', '24x30', 145),
  ('Power Carry Bag', '27x30', 145);
