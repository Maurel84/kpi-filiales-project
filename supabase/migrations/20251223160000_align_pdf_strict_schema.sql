/*
  Align tables strictly to PDF fields (plus minimal system columns).
  System columns kept: id, filiale_id, created_at, created_by.
*/

-- ============================================
-- Drop policies that reference removed columns
-- ============================================
DROP POLICY IF EXISTS "Users lisent ventes de leur filiale" ON ventes;
DROP POLICY IF EXISTS "Commerciaux créent ventes" ON ventes;
DROP POLICY IF EXISTS "Users modifient ventes de leur filiale" ON ventes;

DROP POLICY IF EXISTS "Users lisent ventes perdues de leur filiale" ON ventes_perdues;
DROP POLICY IF EXISTS "Commerciaux déclarent ventes perdues" ON ventes_perdues;
DROP POLICY IF EXISTS "Users modifient ventes perdues de leur filiale" ON ventes_perdues;

DROP POLICY IF EXISTS "Users lisent stock de leur filiale" ON stock_items;
DROP POLICY IF EXISTS "Users gèrent stock de leur filiale" ON stock_items;

DROP POLICY IF EXISTS "Users lisent commandes de leur filiale" ON commandes_fournisseurs;
DROP POLICY IF EXISTS "Users gèrent commandes de leur filiale" ON commandes_fournisseurs;

DROP POLICY IF EXISTS "Admin siège can view all customer orders" ON commandes_clients;
DROP POLICY IF EXISTS "Users can view customer orders from their branch" ON commandes_clients;
DROP POLICY IF EXISTS "Commercial and managers can create customer orders" ON commandes_clients;
DROP POLICY IF EXISTS "Commercial and managers can update customer orders" ON commandes_clients;
DROP POLICY IF EXISTS "Managers can delete customer orders" ON commandes_clients;

DROP POLICY IF EXISTS "Users can view visits from their branch" ON visites_clients;
DROP POLICY IF EXISTS "Users can create visits for their branch" ON visites_clients;
DROP POLICY IF EXISTS "Users can update their own visits" ON visites_clients;
DROP POLICY IF EXISTS "Managers can delete visits" ON visites_clients;

DROP POLICY IF EXISTS "Users can view opportunities from their branch" ON opportunites;
DROP POLICY IF EXISTS "Users can create opportunities for their branch" ON opportunites;
DROP POLICY IF EXISTS "Users can update opportunities they created" ON opportunites;
DROP POLICY IF EXISTS "Managers can delete opportunities" ON opportunites;

DROP POLICY IF EXISTS "Users lisent actions de leur filiale" ON plan_actions;
DROP POLICY IF EXISTS "Managers créent actions" ON plan_actions;
DROP POLICY IF EXISTS "Users modifient leurs actions" ON plan_actions;

DROP POLICY IF EXISTS "Users lisent budgets de leur filiale" ON budgets;
DROP POLICY IF EXISTS "Admins siège gèrent budgets" ON budgets;

DROP POLICY IF EXISTS "Users lisent PDM de leur filiale" ON pdm_entries;
DROP POLICY IF EXISTS "Managers créent PDM" ON pdm_entries;
DROP POLICY IF EXISTS "Managers modifient PDM" ON pdm_entries;

-- ============================================
-- VENTES (ETATS DES VENTES)
-- ============================================
DROP TRIGGER IF EXISTS trg_calculate_marge_vente ON ventes;
DROP FUNCTION IF EXISTS calculate_marge_vente();

DROP INDEX IF EXISTS idx_ventes_commercial;
DROP INDEX IF EXISTS idx_ventes_mois;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventes' AND column_name = 'prix_vente_ht'
  ) THEN
    ALTER TABLE ventes RENAME COLUMN prix_vente_ht TO ca_ht;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventes' AND column_name = 'client_pays'
  ) THEN
    ALTER TABLE ventes RENAME COLUMN client_pays TO pays;
  END IF;
END $$;

ALTER TABLE ventes
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS modele text,
  ADD COLUMN IF NOT EXISTS vendeur text;

ALTER TABLE ventes
  DROP COLUMN IF EXISTS numero,
  DROP COLUMN IF EXISTS article_id,
  DROP COLUMN IF EXISTS stock_item_id,
  DROP COLUMN IF EXISTS quantite,
  DROP COLUMN IF EXISTS prix_revient,
  DROP COLUMN IF EXISTS marge,
  DROP COLUMN IF EXISTS taux_marge,
  DROP COLUMN IF EXISTS mois_vente,
  DROP COLUMN IF EXISTS annee,
  DROP COLUMN IF EXISTS commercial_id,
  DROP COLUMN IF EXISTS statut,
  DROP COLUMN IF EXISTS commentaires;

-- ============================================
-- COMMANDES CLIENTS (ETATS COMMANDES CLIENTS)
-- ============================================
DROP INDEX IF EXISTS idx_commandes_clients_vendeur;
DROP INDEX IF EXISTS idx_commandes_clients_statut;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commandes_clients' AND column_name = 'ca_ht_prevu'
  ) THEN
    ALTER TABLE commandes_clients RENAME COLUMN ca_ht_prevu TO ca_ht;
  END IF;
END $$;

ALTER TABLE commandes_clients
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS vendeur text;

ALTER TABLE commandes_clients
  DROP COLUMN IF EXISTS marque_id,
  DROP COLUMN IF EXISTS vendeur_id,
  DROP COLUMN IF EXISTS devise,
  DROP COLUMN IF EXISTS statut,
  DROP COLUMN IF EXISTS commentaires;

-- ============================================
-- COMMANDES FOURNISSEURS (ETATS COMMANDES FOURNISSEURS)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commandes_fournisseurs' AND column_name = 'numero'
  ) THEN
    ALTER TABLE commandes_fournisseurs RENAME COLUMN numero TO numero_commande;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commandes_fournisseurs' AND column_name = 'date_livraison_prevue'
  ) THEN
    ALTER TABLE commandes_fournisseurs RENAME COLUMN date_livraison_prevue TO eta;
  END IF;
END $$;

ALTER TABLE commandes_fournisseurs
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS modele text,
  ADD COLUMN IF NOT EXISTS gamme text,
  ADD COLUMN IF NOT EXISTS prix_achat_ht numeric(15,2);

ALTER TABLE commandes_fournisseurs
  DROP COLUMN IF EXISTS fournisseur,
  DROP COLUMN IF EXISTS statut,
  DROP COLUMN IF EXISTS montant_total,
  DROP COLUMN IF EXISTS devise,
  DROP COLUMN IF EXISTS commentaires;

-- ============================================
-- STOCK ITEMS (ETAT STOCK)
-- ============================================
DROP INDEX IF EXISTS idx_stock_article;

ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS modele text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

ALTER TABLE stock_items
  DROP COLUMN IF EXISTS article_id,
  DROP COLUMN IF EXISTS quantite,
  DROP COLUMN IF EXISTS emplacement,
  DROP COLUMN IF EXISTS prix_achat_ht,
  DROP COLUMN IF EXISTS updated_at;

-- ============================================
-- VISITES CLIENTS (VISITES CLIENTS)
-- ============================================
ALTER TABLE visites_clients
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

ALTER TABLE visites_clients
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS visite_par_id,
  DROP COLUMN IF EXISTS updated_at;

DROP INDEX IF EXISTS idx_visites_clients_visite_par;

-- ============================================
-- OPPORTUNITES (OPPORTUNITES)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunites' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE opportunites RENAME COLUMN created_by_id TO created_by;
  END IF;
END $$;

ALTER TABLE opportunites
  DROP COLUMN IF EXISTS visite_id,
  DROP COLUMN IF EXISTS devise,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS updated_at;

-- ============================================
-- VENTES PERDUES (LOST SALES)
-- ============================================
DROP INDEX IF EXISTS idx_ventes_perdues_motif;
DROP INDEX IF EXISTS idx_ventes_perdues_article;
DROP INDEX IF EXISTS idx_ventes_perdues_commercial;
DROP INDEX IF EXISTS idx_ventes_perdues_created_by;

ALTER TABLE ventes_perdues
  DROP COLUMN IF EXISTS article_id,
  DROP COLUMN IF EXISTS categorie_produit,
  DROP COLUMN IF EXISTS client_potentiel,
  DROP COLUMN IF EXISTS pays,
  DROP COLUMN IF EXISTS montant_estime,
  DROP COLUMN IF EXISTS date_opportunite,
  DROP COLUMN IF EXISTS mois_perte,
  DROP COLUMN IF EXISTS annee,
  DROP COLUMN IF EXISTS motif_perte,
  DROP COLUMN IF EXISTS concurrent,
  DROP COLUMN IF EXISTS commercial_id,
  DROP COLUMN IF EXISTS commentaires_analyse;

-- ============================================
-- PLAN ACTIONS (PLAN D'ACTION)
-- ============================================
ALTER TABLE plan_actions
  DROP COLUMN IF EXISTS responsable_id,
  DROP COLUMN IF EXISTS updated_at;

-- ============================================
-- BUDGETS (BUDGET)
-- ============================================
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS budget_jan numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_fev numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_mar numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_avr numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_mai numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_jui numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_juil numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_aou numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_sep numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_oct numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_nov numeric(15,2),
  ADD COLUMN IF NOT EXISTS budget_dec numeric(15,2),
  ADD COLUMN IF NOT EXISTS cumul_fin_dec numeric(15,2),
  ADD COLUMN IF NOT EXISTS plan_n1 numeric(15,2),
  ADD COLUMN IF NOT EXISTS plan_n2 numeric(15,2);

ALTER TABLE budgets
  DROP COLUMN IF EXISTS mois,
  DROP COLUMN IF EXISTS type_budget,
  DROP COLUMN IF EXISTS montant,
  DROP COLUMN IF EXISTS devise,
  DROP COLUMN IF EXISTS commentaires,
  DROP COLUMN IF EXISTS updated_at;

-- ============================================
-- PDM (PDM KALMAR/MANITOU/MASSEY/NARDI)
-- ============================================
ALTER TABLE pdm_entries
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS categorie text,
  ADD COLUMN IF NOT EXISTS industrie numeric(15,2),
  ADD COLUMN IF NOT EXISTS src numeric(15,2),
  ADD COLUMN IF NOT EXISTS source_industrie_type text;

ALTER TABLE pdm_entries
  DROP CONSTRAINT IF EXISTS pdm_source_industrie_type_check;

ALTER TABLE pdm_entries
  ADD CONSTRAINT pdm_source_industrie_type_check
  CHECK (
    source_industrie_type IS NULL
    OR source_industrie_type IN ('AEM TABLE', 'WITS Shipment', 'WITS Order')
  );

ALTER TABLE pdm_entries
  DROP COLUMN IF EXISTS marque_id,
  DROP COLUMN IF EXISTS categorie_id,
  DROP COLUMN IF EXISTS modele_id,
  DROP COLUMN IF EXISTS source_industrie,
  DROP COLUMN IF EXISTS source_src,
  DROP COLUMN IF EXISTS objectif_ventes,
  DROP COLUMN IF EXISTS commentaires,
  DROP COLUMN IF EXISTS updated_at;

-- ============================================
-- NARDI in marques
-- ============================================
INSERT INTO marques (code, nom, actif)
VALUES ('NARDI', 'NARDI', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Recreate simplified RLS policies
-- ============================================
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes_perdues ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ventes access by filiale"
  ON ventes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  );

CREATE POLICY "Ventes perdues access by filiale"
  ON ventes_perdues FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  );

CREATE POLICY "Stock access by filiale"
  ON stock_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = stock_items.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = stock_items.filiale_id)
    )
  );

CREATE POLICY "Commandes fournisseurs access by filiale"
  ON commandes_fournisseurs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = commandes_fournisseurs.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = commandes_fournisseurs.filiale_id)
    )
  );

CREATE POLICY "Commandes clients access by filiale"
  ON commandes_clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = commandes_clients.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = commandes_clients.filiale_id)
    )
  );

CREATE POLICY "Visites clients access by filiale"
  ON visites_clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = visites_clients.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = visites_clients.filiale_id)
    )
  );

CREATE POLICY "Opportunites access by filiale"
  ON opportunites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = opportunites.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = opportunites.filiale_id)
    )
  );

CREATE POLICY "Plan actions access by filiale"
  ON plan_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = plan_actions.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = plan_actions.filiale_id)
    )
  );

CREATE POLICY "Budgets access by filiale"
  ON budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = budgets.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = budgets.filiale_id)
    )
  );

CREATE POLICY "PDM access by filiale"
  ON pdm_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
        AND up.actif = true
        AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  );
