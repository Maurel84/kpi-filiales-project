/*
  # Optimize RLS Policies - Part 2

  ## Overview
  Continues optimization of RLS policies for remaining tables.

  ## Changes
  Updates RLS policies for:
  - ventes
  - ventes_perdues
  - forecasts
  - parc_machines
  - inspections_techniques
  - audit_log
  - marques
  - categories_produits
  - modeles_produits
  - pdm_entries
  - plan_actions
  - historique_ventes_modeles
  - previsions_ventes_modeles
  - commandes_clients
  - visites_clients
  - opportunites

  ## Performance Impact
  Prevents re-evaluation of auth functions for each row.
*/

-- ============================================================================
-- VENTES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent ventes de leur filiale" ON ventes;
DROP POLICY IF EXISTS "Commerciaux créent ventes" ON ventes;
DROP POLICY IF EXISTS "Users modifient ventes de leur filiale" ON ventes;

CREATE POLICY "Users lisent ventes de leur filiale"
  ON ventes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  );

CREATE POLICY "Commerciaux créent ventes"
  ON ventes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial', 'saisie')
    )
  );

CREATE POLICY "Users modifient ventes de leur filiale"
  ON ventes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  );

-- ============================================================================
-- VENTES_PERDUES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent ventes perdues de leur filiale" ON ventes_perdues;
DROP POLICY IF EXISTS "Commerciaux déclarent ventes perdues" ON ventes_perdues;
DROP POLICY IF EXISTS "Users modifient ventes perdues de leur filiale" ON ventes_perdues;

CREATE POLICY "Users lisent ventes perdues de leur filiale"
  ON ventes_perdues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  );

CREATE POLICY "Commerciaux déclarent ventes perdues"
  ON ventes_perdues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
    )
  );

CREATE POLICY "Users modifient ventes perdues de leur filiale"
  ON ventes_perdues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  );

-- ============================================================================
-- FORECASTS
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent forecasts de leur filiale" ON forecasts;
DROP POLICY IF EXISTS "Managers créent forecasts" ON forecasts;
DROP POLICY IF EXISTS "Admins siège modifient forecasts" ON forecasts;

CREATE POLICY "Users lisent forecasts de leur filiale"
  ON forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = forecasts.filiale_id)
    )
  );

CREATE POLICY "Managers créent forecasts"
  ON forecasts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = forecasts.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

CREATE POLICY "Admins siège modifient forecasts"
  ON forecasts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- PARC_MACHINES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent parc machines" ON parc_machines;
DROP POLICY IF EXISTS "Users gèrent parc machines de leur filiale" ON parc_machines;

CREATE POLICY "Users lisent parc machines"
  ON parc_machines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = parc_machines.filiale_vendeur_id)
    )
  );

CREATE POLICY "Users gèrent parc machines de leur filiale"
  ON parc_machines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = parc_machines.filiale_vendeur_id)
    )
  );

-- ============================================================================
-- INSPECTIONS_TECHNIQUES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent inspections de leur filiale" ON inspections_techniques;
DROP POLICY IF EXISTS "Techniciens créent inspections" ON inspections_techniques;
DROP POLICY IF EXISTS "Techniciens modifient leurs inspections" ON inspections_techniques;

CREATE POLICY "Users lisent inspections de leur filiale"
  ON inspections_techniques FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      JOIN parc_machines pm ON pm.filiale_vendeur_id = up.filiale_id
      WHERE up.id = (select auth.uid())
      AND pm.id = inspections_techniques.machine_id
      AND (up.role = 'admin_siege' OR up.filiale_id = pm.filiale_vendeur_id)
    )
  );

CREATE POLICY "Techniciens créent inspections"
  ON inspections_techniques FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      JOIN parc_machines pm ON pm.filiale_vendeur_id = up.filiale_id
      WHERE up.id = (select auth.uid())
      AND pm.id = inspections_techniques.machine_id
      AND up.role IN ('admin_siege', 'manager_filiale', 'technicien')
    )
  );

CREATE POLICY "Techniciens modifient leurs inspections"
  ON inspections_techniques FOR UPDATE
  TO authenticated
  USING (
    technicien_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- AUDIT_LOG
-- ============================================================================

DROP POLICY IF EXISTS "Admins siège lisent audit" ON audit_log;

CREATE POLICY "Admins siège lisent audit"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

-- ============================================================================
-- MARQUES
-- ============================================================================

DROP POLICY IF EXISTS "Admins gèrent marques" ON marques;

CREATE POLICY "Admins gèrent marques"
  ON marques FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- CATEGORIES_PRODUITS
-- ============================================================================

DROP POLICY IF EXISTS "Admins gèrent catégories" ON categories_produits;

CREATE POLICY "Admins gèrent catégories"
  ON categories_produits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- MODELES_PRODUITS
-- ============================================================================

DROP POLICY IF EXISTS "Admins gèrent modèles" ON modeles_produits;

CREATE POLICY "Admins gèrent modèles"
  ON modeles_produits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- PDM_ENTRIES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent PDM de leur filiale" ON pdm_entries;
DROP POLICY IF EXISTS "Managers créent PDM" ON pdm_entries;
DROP POLICY IF EXISTS "Managers modifient PDM" ON pdm_entries;

CREATE POLICY "Users lisent PDM de leur filiale"
  ON pdm_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  );

CREATE POLICY "Managers créent PDM"
  ON pdm_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

CREATE POLICY "Managers modifient PDM"
  ON pdm_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- PLAN_ACTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent actions de leur filiale" ON plan_actions;
DROP POLICY IF EXISTS "Managers créent actions" ON plan_actions;
DROP POLICY IF EXISTS "Users modifient leurs actions" ON plan_actions;

CREATE POLICY "Users lisent actions de leur filiale"
  ON plan_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = plan_actions.filiale_id)
    )
  );

CREATE POLICY "Managers créent actions"
  ON plan_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = plan_actions.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

CREATE POLICY "Users modifient leurs actions"
  ON plan_actions FOR UPDATE
  TO authenticated
  USING (
    responsable_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- HISTORIQUE_VENTES_MODELES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent historique de leur filiale" ON historique_ventes_modeles;
DROP POLICY IF EXISTS "Admins gèrent historique ventes" ON historique_ventes_modeles;

CREATE POLICY "Users lisent historique de leur filiale"
  ON historique_ventes_modeles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = historique_ventes_modeles.filiale_id)
    )
  );

CREATE POLICY "Admins gèrent historique ventes"
  ON historique_ventes_modeles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- PREVISIONS_VENTES_MODELES
-- ============================================================================

DROP POLICY IF EXISTS "Users lisent prévisions de leur filiale" ON previsions_ventes_modeles;
DROP POLICY IF EXISTS "Managers créent prévisions" ON previsions_ventes_modeles;
DROP POLICY IF EXISTS "Managers modifient prévisions" ON previsions_ventes_modeles;

CREATE POLICY "Users lisent prévisions de leur filiale"
  ON previsions_ventes_modeles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
    )
  );

CREATE POLICY "Managers créent prévisions"
  ON previsions_ventes_modeles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

CREATE POLICY "Managers modifient prévisions"
  ON previsions_ventes_modeles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- COMMANDES_CLIENTS
-- ============================================================================

DROP POLICY IF EXISTS "Admin siège can view all customer orders" ON commandes_clients;
DROP POLICY IF EXISTS "Users can view customer orders from their branch" ON commandes_clients;
DROP POLICY IF EXISTS "Commercial and managers can create customer orders" ON commandes_clients;
DROP POLICY IF EXISTS "Commercial and managers can update customer orders" ON commandes_clients;
DROP POLICY IF EXISTS "Managers can delete customer orders" ON commandes_clients;

CREATE POLICY "Admin siège can view all customer orders"
  ON commandes_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

CREATE POLICY "Users can view customer orders from their branch"
  ON commandes_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND up.filiale_id = commandes_clients.filiale_id
    )
  );

CREATE POLICY "Commercial and managers can create customer orders"
  ON commandes_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_clients.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
    )
  );

CREATE POLICY "Commercial and managers can update customer orders"
  ON commandes_clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_clients.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
    )
  );

CREATE POLICY "Managers can delete customer orders"
  ON commandes_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_clients.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale')
    )
  );

-- ============================================================================
-- VISITES_CLIENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view visits from their branch" ON visites_clients;
DROP POLICY IF EXISTS "Users can create visits for their branch" ON visites_clients;
DROP POLICY IF EXISTS "Users can update their own visits" ON visites_clients;
DROP POLICY IF EXISTS "Managers can delete visits" ON visites_clients;

CREATE POLICY "Users can view visits from their branch"
  ON visites_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = visites_clients.filiale_id)
    )
  );

CREATE POLICY "Users can create visits for their branch"
  ON visites_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = visites_clients.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
    )
  );

CREATE POLICY "Users can update their own visits"
  ON visites_clients FOR UPDATE
  TO authenticated
  USING (
    visite_par_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = visites_clients.filiale_id)
    )
  );

CREATE POLICY "Managers can delete visits"
  ON visites_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = visites_clients.filiale_id)
    )
  );

-- ============================================================================
-- OPPORTUNITES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view opportunities from their branch" ON opportunites;
DROP POLICY IF EXISTS "Users can create opportunities for their branch" ON opportunites;
DROP POLICY IF EXISTS "Users can update opportunities they created" ON opportunites;
DROP POLICY IF EXISTS "Managers can delete opportunities" ON opportunites;

CREATE POLICY "Users can view opportunities from their branch"
  ON opportunites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = opportunites.filiale_id)
    )
  );

CREATE POLICY "Users can create opportunities for their branch"
  ON opportunites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND (up.role = 'admin_siege' OR up.filiale_id = opportunites.filiale_id)
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
    )
  );

CREATE POLICY "Users can update opportunities they created"
  ON opportunites FOR UPDATE
  TO authenticated
  USING (
    created_by_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = opportunites.filiale_id)
    )
  );

CREATE POLICY "Managers can delete opportunities"
  ON opportunites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = (select auth.uid())
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = opportunites.filiale_id)
    )
  );
