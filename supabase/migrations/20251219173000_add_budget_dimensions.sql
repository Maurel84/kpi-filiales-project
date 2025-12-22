-- Add extra budget dimensions used by the UI
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS produit text,
  ADD COLUMN IF NOT EXISTS plan_compte text,
  ADD COLUMN IF NOT EXISTS constructeur text;
