/*
  # Optimize RLS Policies - Part 1

  ## Overview
  Optimizes RLS policies by wrapping auth function calls with SELECT.
  This prevents re-evaluation of auth functions for each row, significantly improving performance.

  ## Changes
  Updates RLS policies for core tables:
  - filiales
  - users_profiles
  - kpis_reporting
  - articles
  - stock_items
  - budgets
  - commandes_fournisseurs
  - lignes_commandes
  - entrees_stock
  - sessions_interfiliales

  ## Performance Impact
  Changes `auth.uid()` to `(select auth.uid())` to evaluate once per query instead of once per row.
*/

-- ============================================================================
-- FILIALES
-- ============================================================================

DROP POLICY IF EXISTS "Admins siège gèrent filiales" ON filiales;
DROP POLICY IF EXISTS "Tous peuvent lire filiales" ON filiales;

CREATE POLICY "Admins siège gèrent filiales"
  ON filiales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

CREATE POLICY "Tous peuvent lire filiales"
  ON filiales FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- USERS_PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent leur profil" ON users_profiles;
DROP POLICY IF EXISTS "Admins siège gèrent profils" ON users_profiles;

CREATE POLICY "Users lisent leur profil"
  ON users_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Admins siège gèrent profils"
  ON users_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

-- ============================================================================
-- KPIS_REPORTING
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent KPIs de leur filiale" ON kpis_reporting;
DROP POLICY IF EXISTS "Users créent KPIs pour leur filiale" ON kpis_reporting;
DROP POLICY IF EXISTS "Users modifient KPIs non Closed" ON kpis_reporting;
DROP POLICY IF EXISTS "Admins siège suppriment KPIs" ON kpis_reporting;

CREATE POLICY "Users lisent KPIs de leur filiale"
  ON kpis_reporting FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = kpis_reporting.filiale_id)
    )
  );

CREATE POLICY "Users créent KPIs pour leur filiale"
  ON kpis_reporting FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = kpis_reporting.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'saisie')
    )
  );

CREATE POLICY "Users modifient KPIs non Closed"
  ON kpis_reporting FOR UPDATE
  TO authenticated
  USING (
    status != 'Closed'
    AND EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = kpis_reporting.filiale_id)
    )
  );

CREATE POLICY "Admins siège suppriment KPIs"
  ON kpis_reporting FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

-- ============================================================================
-- ARTICLES
-- ============================================================================

DROP POLICY IF EXISTS "Managers gèrent articles" ON articles;

CREATE POLICY "Managers gèrent articles"
  ON articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- STOCK_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent stock de leur filiale" ON stock_items;
DROP POLICY IF EXISTS "Users gèrent stock de leur filiale" ON stock_items;

CREATE POLICY "Users lisent stock de leur filiale"
  ON stock_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = stock_items.filiale_id)
    )
  );

CREATE POLICY "Users gèrent stock de leur filiale"
  ON stock_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = stock_items.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'saisie')
    )
  );

-- ============================================================================
-- BUDGETS
-- ============================================================================

DROP POLICY IF EXISTS "Admins siège gèrent budgets" ON budgets;
DROP POLICY IF EXISTS "Users lisent budgets de leur filiale" ON budgets;

CREATE POLICY "Admins siège gèrent budgets"
  ON budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

CREATE POLICY "Users lisent budgets de leur filiale"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = budgets.filiale_id)
    )
  );

-- ============================================================================
-- COMMANDES_FOURNISSEURS
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent commandes de leur filiale" ON commandes_fournisseurs;
DROP POLICY IF EXISTS "Users gèrent commandes de leur filiale" ON commandes_fournisseurs;

CREATE POLICY "Users lisent commandes de leur filiale"
  ON commandes_fournisseurs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_fournisseurs.filiale_id)
    )
  );

CREATE POLICY "Users gèrent commandes de leur filiale"
  ON commandes_fournisseurs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_fournisseurs.filiale_id)
    )
  );

-- ============================================================================
-- LIGNES_COMMANDES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent lignes commandes de leur filiale" ON lignes_commandes;
DROP POLICY IF EXISTS "Users gèrent lignes commandes de leur filiale" ON lignes_commandes;

CREATE POLICY "Users lisent lignes commandes de leur filiale"
  ON lignes_commandes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      JOIN commandes_fournisseurs cf ON cf.filiale_id = up.filiale_id
      WHERE up.id = (select auth.uid())
      AND cf.id = lignes_commandes.commande_id
      AND (up.role = 'admin_siege' OR up.filiale_id = cf.filiale_id)
    )
  );

CREATE POLICY "Users gèrent lignes commandes de leur filiale"
  ON lignes_commandes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      JOIN commandes_fournisseurs cf ON cf.filiale_id = up.filiale_id
      WHERE up.id = (select auth.uid())
      AND cf.id = lignes_commandes.commande_id
      AND (up.role = 'admin_siege' OR up.filiale_id = cf.filiale_id)
    )
  );

-- ============================================================================
-- ENTREES_STOCK
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent entrées stock de leur filiale" ON entrees_stock;
DROP POLICY IF EXISTS "Users créent entrées stock pour leur filiale" ON entrees_stock;
DROP POLICY IF EXISTS "Managers valident entrées stock" ON entrees_stock;

CREATE POLICY "Users lisent entrées stock de leur filiale"
  ON entrees_stock FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
    )
  );

CREATE POLICY "Users créent entrées stock pour leur filiale"
  ON entrees_stock FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
    )
  );

CREATE POLICY "Managers valident entrées stock"
  ON entrees_stock FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- SESSIONS_INTERFILIALES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent sessions de leur filiale" ON sessions_interfiliales;
DROP POLICY IF EXISTS "Users créent sessions depuis leur filiale" ON sessions_interfiliales;
DROP POLICY IF EXISTS "Managers valident sessions" ON sessions_interfiliales;

CREATE POLICY "Users lisent sessions de leur filiale"
  ON sessions_interfiliales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (
        up.role = 'admin_siege'
        OR up.filiale_id = sessions_interfiliales.filiale_origine_id
        OR up.filiale_id = sessions_interfiliales.filiale_destination_id
      )
    )
  );

CREATE POLICY "Users créent sessions depuis leur filiale"
  ON sessions_interfiliales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = sessions_interfiliales.filiale_origine_id)
    )
  );

CREATE POLICY "Managers valident sessions"
  ON sessions_interfiliales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (
        up.role = 'admin_siege'
        OR up.filiale_id = sessions_interfiliales.filiale_origine_id
        OR up.filiale_id = sessions_interfiliales.filiale_destination_id
      )
    )
  );
