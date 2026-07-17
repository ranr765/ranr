-- Exact map locations for shops and suppliers (captured on the phone or from a
-- Google Maps link). Foundation for route planning and the day-plan feature.
ALTER TABLE customers ADD COLUMN lat REAL;
ALTER TABLE customers ADD COLUMN lng REAL;
ALTER TABLE suppliers ADD COLUMN lat REAL;
ALTER TABLE suppliers ADD COLUMN lng REAL;
