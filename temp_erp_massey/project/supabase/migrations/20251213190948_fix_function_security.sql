/*
  # Fix Function Security

  ## Overview
  Sets immutable search paths on all functions to prevent security issues.
  Functions with mutable search paths can be vulnerable to search path attacks.

  ## Changes
  Sets search_path to 'public, pg_temp' for all database functions:
  - calculate_prix_revient
  - calculate_montant_final_forecast
  - calculate_marge_vente
  - update_updated_at_column

  ## Security Impact
  Prevents search path manipulation attacks by fixing the search path at function creation time.
*/

-- Set stable search paths on all functions
ALTER FUNCTION calculate_prix_revient() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_montant_final_forecast() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_marge_vente() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
