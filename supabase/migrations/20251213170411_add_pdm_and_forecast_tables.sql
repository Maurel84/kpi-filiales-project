/*
  # Ajout des tables pour PDM, Plan d'Actions et Forecast
  
  ## 1. Vue d'ensemble
  Cette migration ajoute les tables nécessaires pour gérer :
  - Les Plans de Marché (PDM) par marque
  - Les plans d'actions avec suivi de statut
  - L'historique des ventes par modèle
  - Les prévisions (forecasts) détaillées par modèle
  
  ## 2. Nouvelles tables
  
  ### Référentiels
  - `marques` - Marques de produits (Manitou, Kalmar, Massey Ferguson)
  - `categories_produits` - Catégories (Chariots, Télescopiques, Tracteurs, etc.)
  - `modeles_produits` - Catalogue complet des modèles
  
  ### Gestion
  - `pdm_entries` - Entrées des Plans de Marché
  - `plan_actions` - Suivi des actions avec priorités
  - `historique_ventes_modeles` - Historique des ventes réelles par modèle
  - `previsions_ventes_modeles` - Prévisions mensuelles par modèle
  
  ## 3. Sécurité RLS
  - Toutes les tables ont RLS activé
  - Accès selon les rôles (admin_siege, manager_filiale, commercial)
  
  ## 4. Index de performance
  - Index sur marque, catégorie, année, mois
  - Index composites pour requêtes fréquentes
*/

-- =====================================================
-- 1. RÉFÉRENTIELS
-- =====================================================

-- Table des marques
CREATE TABLE IF NOT EXISTS marques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  nom text NOT NULL,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table des catégories de produits
CREATE TABLE IF NOT EXISTS categories_produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marque_id uuid REFERENCES marques(id),
  code text NOT NULL,
  nom text NOT NULL,
  type_produit text CHECK (type_produit IN ('Chariot', 'Telescopique', 'Nacelle', 'Tracteur', 'Moissonneuse', 'Reachstacker', 'Terminal_Tractor', 'Autre')),
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(marque_id, code)
);

-- Table des modèles de produits
CREATE TABLE IF NOT EXISTS modeles_produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marque_id uuid NOT NULL REFERENCES marques(id),
  categorie_id uuid REFERENCES categories_produits(id),
  code_modele text NOT NULL,
  nom_complet text NOT NULL,
  puissance_cv integer,
  caracteristiques text,
  type_energie text CHECK (type_energie IN ('Electrique', 'Diesel', 'Essence', 'Hybride', 'Autre')),
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(marque_id, code_modele)
);

CREATE INDEX IF NOT EXISTS idx_modeles_marque ON modeles_produits(marque_id);
CREATE INDEX IF NOT EXISTS idx_modeles_categorie ON modeles_produits(categorie_id);

-- =====================================================
-- 2. PLANS DE MARCHÉ (PDM)
-- =====================================================

CREATE TABLE IF NOT EXISTS pdm_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id),
  marque_id uuid NOT NULL REFERENCES marques(id),
  categorie_id uuid REFERENCES categories_produits(id),
  modele_id uuid REFERENCES modeles_produits(id),
  annee integer NOT NULL,
  source_industrie text,
  source_src text,
  objectif_ventes integer DEFAULT 0,
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdm_filiale_annee ON pdm_entries(filiale_id, annee);
CREATE INDEX IF NOT EXISTS idx_pdm_marque ON pdm_entries(marque_id);

-- =====================================================
-- 3. PLAN D'ACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id),
  date_action date NOT NULL,
  action text NOT NULL,
  niveau_priorite text CHECK (niveau_priorite IN ('Haute', 'Moyenne', 'Basse')) DEFAULT 'Moyenne',
  responsable_id uuid REFERENCES auth.users(id),
  responsable_nom text,
  date_fin_prevue date,
  statut text CHECK (statut IN ('En_cours', 'Retard', 'Termine', 'Annule')) DEFAULT 'En_cours',
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_filiale_statut ON plan_actions(filiale_id, statut);
CREATE INDEX IF NOT EXISTS idx_actions_responsable ON plan_actions(responsable_id);
CREATE INDEX IF NOT EXISTS idx_actions_date_fin ON plan_actions(date_fin_prevue);

-- =====================================================
-- 4. HISTORIQUE VENTES PAR MODÈLE
-- =====================================================

CREATE TABLE IF NOT EXISTS historique_ventes_modeles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id),
  marque_id uuid NOT NULL REFERENCES marques(id),
  categorie_id uuid REFERENCES categories_produits(id),
  modele_id uuid REFERENCES modeles_produits(id),
  code_modele text NOT NULL,
  annee integer NOT NULL,
  quantite_vendue integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(filiale_id, modele_id, annee)
);

CREATE INDEX IF NOT EXISTS idx_hist_ventes_filiale ON historique_ventes_modeles(filiale_id);
CREATE INDEX IF NOT EXISTS idx_hist_ventes_modele ON historique_ventes_modeles(modele_id);
CREATE INDEX IF NOT EXISTS idx_hist_ventes_annee ON historique_ventes_modeles(annee);

-- =====================================================
-- 5. PRÉVISIONS VENTES PAR MODÈLE
-- =====================================================

CREATE TABLE IF NOT EXISTS previsions_ventes_modeles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id),
  marque_id uuid NOT NULL REFERENCES marques(id),
  categorie_id uuid REFERENCES categories_produits(id),
  modele_id uuid REFERENCES modeles_produits(id),
  code_modele text NOT NULL,
  annee integer NOT NULL,
  mois integer NOT NULL CHECK (mois BETWEEN 1 AND 12),
  quantite_prevue integer DEFAULT 0,
  type_prevision text CHECK (type_prevision IN ('Budget', 'Forecast', 'Commandes')) DEFAULT 'Forecast',
  modifie_par_id uuid REFERENCES auth.users(id),
  date_modification timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(filiale_id, modele_id, annee, mois, type_prevision)
);

CREATE INDEX IF NOT EXISTS idx_prev_ventes_filiale ON previsions_ventes_modeles(filiale_id);
CREATE INDEX IF NOT EXISTS idx_prev_ventes_modele ON previsions_ventes_modeles(modele_id);
CREATE INDEX IF NOT EXISTS idx_prev_ventes_periode ON previsions_ventes_modeles(annee, mois);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE marques ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_ventes_modeles ENABLE ROW LEVEL SECURITY;
ALTER TABLE previsions_ventes_modeles ENABLE ROW LEVEL SECURITY;

-- Politiques RLS - MARQUES (lecture publique)
CREATE POLICY "Tous lisent marques"
  ON marques FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins gèrent marques"
  ON marques FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - CATÉGORIES (lecture publique)
CREATE POLICY "Tous lisent catégories"
  ON categories_produits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins gèrent catégories"
  ON categories_produits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - MODÈLES (lecture publique)
CREATE POLICY "Tous lisent modèles"
  ON modeles_produits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins gèrent modèles"
  ON modeles_produits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - PDM ENTRIES
CREATE POLICY "Users lisent PDM de leur filiale"
  ON pdm_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  );

CREATE POLICY "Managers créent PDM"
  ON pdm_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  );

CREATE POLICY "Managers modifient PDM"
  ON pdm_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = pdm_entries.filiale_id)
    )
  );

-- Politiques RLS - PLAN ACTIONS
CREATE POLICY "Users lisent actions de leur filiale"
  ON plan_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = plan_actions.filiale_id OR up.id = plan_actions.responsable_id)
    )
  );

CREATE POLICY "Managers créent actions"
  ON plan_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = plan_actions.filiale_id)
    )
  );

CREATE POLICY "Users modifient leurs actions"
  ON plan_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'admin_siege' 
        OR (up.filiale_id = plan_actions.filiale_id AND up.role IN ('manager_filiale', 'commercial'))
        OR up.id = plan_actions.responsable_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'admin_siege' 
        OR (up.filiale_id = plan_actions.filiale_id AND up.role IN ('manager_filiale', 'commercial'))
        OR up.id = plan_actions.responsable_id
      )
    )
  );

-- Politiques RLS - HISTORIQUE VENTES MODÈLES
CREATE POLICY "Users lisent historique de leur filiale"
  ON historique_ventes_modeles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = historique_ventes_modeles.filiale_id)
    )
  );

CREATE POLICY "Admins gèrent historique ventes"
  ON historique_ventes_modeles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - PRÉVISIONS VENTES MODÈLES
CREATE POLICY "Users lisent prévisions de leur filiale"
  ON previsions_ventes_modeles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
    )
  );

CREATE POLICY "Managers créent prévisions"
  ON previsions_ventes_modeles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
    )
  );

CREATE POLICY "Managers modifient prévisions"
  ON previsions_ventes_modeles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale', 'commercial')
      AND (up.role = 'admin_siege' OR up.filiale_id = previsions_ventes_modeles.filiale_id)
    )
  );
