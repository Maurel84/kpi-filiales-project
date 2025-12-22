-- Add missing stock/ventes fields to align with PDF columns

ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS gamme text,
  ADD COLUMN IF NOT EXISTS pays text;

ALTER TABLE ventes
  ADD COLUMN IF NOT EXISTS gamme text,
  ADD COLUMN IF NOT EXISTS src text;
