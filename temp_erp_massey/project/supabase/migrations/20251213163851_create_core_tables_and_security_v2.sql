/*
  # Création de l'architecture de base - Application Multi-Filiales
  
  ## 1. Vue d'ensemble
  Cette migration crée la structure complète pour une application de gestion multi-filiales
  avec suivi des KPIs, stocks, ventes, commandes et parc machines.
  
  ## 2. Tables créées
  
  ### Tables de référence
  - `filiales` - Succursales du groupe (9 filiales)
  - `users_profiles` - Profils utilisateurs étendus avec rôles
  
  ### Gestion des KPIs
  - `kpis_reporting` - Données KPI centralisées avec workflow de validation
  
  ### Gestion des stocks
  - `articles` - Catalogue d'articles/machines
  - `stock_items` - Stock par filiale
  - `commandes_fournisseurs` - Commandes fournisseurs
  - `lignes_commandes` - Lignes de commandes
  - `entrees_stock` - Entrées en stock validées
  - `sessions_interfiliales` - Transferts entre filiales
  
  ### Gestion commerciale
  - `ventes` - Ventes réalisées
  - `ventes_perdues` - Opportunités perdues
  - `forecasts` - Prévisions commerciales
  
  ### Gestion technique
  - `parc_machines` - Parc machines clients
  - `inspections_techniques` - Inspections réalisées
  
  ### Budgets et suivi
  - `budgets` - Budgets annuels par filiale
  - `audit_log` - Historique des modifications
  
  ## 3. Sécurité RLS
  - Toutes les tables ont RLS activé
  - Politiques restrictives par défaut
  - Accès filtré par filiale pour users non-admin
  
  ## 4. Notes importantes
  - Colonnes calculées utilisent des triggers pour éviter problèmes d'immutabilité
  - Index optimisés pour requêtes fréquentes
  - Validation des statuts via CHECK constraints
*/

-- =====================================================
-- 1. TABLES DE RÉFÉRENCE
-- =====================================================

CREATE TABLE IF NOT EXISTS filiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  nom text NOT NULL,
  pays text NOT NULL,
  devise text DEFAULT 'EUR',
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  filiale_id uuid REFERENCES filiales(id),
  role text NOT NULL CHECK (role IN ('admin_siege', 'manager_filiale', 'commercial', 'technicien', 'saisie')),
  poste text,
  prenom text,
  nom text,
  email text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. GESTION DES KPIs
-- =====================================================

CREATE TABLE IF NOT EXISTS kpis_reporting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  type_kpi text NOT NULL CHECK (type_kpi IN ('Production', 'Rendement', 'Heures', 'Couts', 'Manutention', 'Agriculture', 'RH', 'Financier', 'Autre')),
  date_entree date NOT NULL DEFAULT CURRENT_DATE,
  mois_cloture text NOT NULL,
  annee integer NOT NULL,
  ligne integer,
  valeur numeric(15,2),
  unite text,
  commentaires text,
  responsable_saisie_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Closed', 'Reopened_by_Mgmt')),
  valide_par_id uuid REFERENCES auth.users(id),
  date_validation timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  modified_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_kpis_filiale_mois ON kpis_reporting(filiale_id, mois_cloture);
CREATE INDEX IF NOT EXISTS idx_kpis_type ON kpis_reporting(type_kpi);
CREATE INDEX IF NOT EXISTS idx_kpis_status ON kpis_reporting(status);
CREATE INDEX IF NOT EXISTS idx_kpis_date ON kpis_reporting(date_entree);

-- =====================================================
-- 3. GESTION DES STOCKS
-- =====================================================

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  libelle text NOT NULL,
  categorie text CHECK (categorie IN ('Machine', 'Piece', 'Consommable', 'Service')),
  marque text,
  modele text,
  prix_achat_ht numeric(15,2),
  coefficient_prix_revient numeric(5,2) DEFAULT 1.0,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  numero_serie text,
  quantite numeric(10,2) DEFAULT 1,
  emplacement text,
  date_entree date DEFAULT CURRENT_DATE,
  prix_achat_ht numeric(15,2),
  prix_revient numeric(15,2),
  statut text DEFAULT 'Disponible' CHECK (statut IN ('Disponible', 'Reserve', 'Vendu', 'Transfert', 'Obsolete')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_filiale ON stock_items(filiale_id);
CREATE INDEX IF NOT EXISTS idx_stock_article ON stock_items(article_id);
CREATE INDEX IF NOT EXISTS idx_stock_statut ON stock_items(statut);
CREATE INDEX IF NOT EXISTS idx_stock_date_entree ON stock_items(date_entree);

CREATE TABLE IF NOT EXISTS commandes_fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  fournisseur text NOT NULL,
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  date_commande date DEFAULT CURRENT_DATE,
  date_livraison_prevue date,
  statut text DEFAULT 'En_cours' CHECK (statut IN ('En_cours', 'Livree', 'Partiellement_livree', 'Annulee')),
  montant_total numeric(15,2) DEFAULT 0,
  devise text DEFAULT 'EUR',
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lignes_commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid NOT NULL REFERENCES commandes_fournisseurs(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite numeric(10,2) NOT NULL,
  prix_unitaire_ht numeric(15,2) NOT NULL,
  quantite_recue numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrees_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid REFERENCES commandes_fournisseurs(id),
  ligne_commande_id uuid REFERENCES lignes_commandes(id),
  article_id uuid NOT NULL REFERENCES articles(id),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  numero_serie text,
  quantite numeric(10,2) NOT NULL,
  prix_achat_ht numeric(15,2) NOT NULL,
  coefficient_prix_revient numeric(5,2) NOT NULL,
  prix_revient numeric(15,2),
  date_entree date DEFAULT CURRENT_DATE,
  valide boolean DEFAULT false,
  valide_par_id uuid REFERENCES auth.users(id),
  date_validation timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions_interfiliales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  filiale_origine_id uuid NOT NULL REFERENCES filiales(id),
  filiale_destination_id uuid NOT NULL REFERENCES filiales(id),
  article_id uuid NOT NULL REFERENCES articles(id),
  stock_item_id uuid REFERENCES stock_items(id),
  numero_serie text,
  quantite numeric(10,2) NOT NULL,
  prix_transfert numeric(15,2),
  statut text DEFAULT 'En_attente' CHECK (statut IN ('En_attente', 'Validee', 'Refusee', 'Recue')),
  demande_par_id uuid REFERENCES auth.users(id),
  date_demande timestamptz DEFAULT now(),
  valide_origine_par_id uuid REFERENCES auth.users(id),
  date_validation_origine timestamptz,
  valide_destination_par_id uuid REFERENCES auth.users(id),
  date_validation_destination timestamptz,
  commentaires text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_origine ON sessions_interfiliales(filiale_origine_id);
CREATE INDEX IF NOT EXISTS idx_sessions_destination ON sessions_interfiliales(filiale_destination_id);
CREATE INDEX IF NOT EXISTS idx_sessions_statut ON sessions_interfiliales(statut);

-- =====================================================
-- 4. GESTION COMMERCIALE
-- =====================================================

CREATE TABLE IF NOT EXISTS ventes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  article_id uuid NOT NULL REFERENCES articles(id),
  stock_item_id uuid REFERENCES stock_items(id),
  client_nom text NOT NULL,
  client_pays text,
  numero_serie text,
  quantite numeric(10,2) NOT NULL,
  prix_vente_ht numeric(15,2) NOT NULL,
  prix_revient numeric(15,2),
  marge numeric(15,2),
  taux_marge numeric(5,2),
  date_vente date DEFAULT CURRENT_DATE,
  mois_vente text,
  annee integer,
  commercial_id uuid REFERENCES auth.users(id),
  statut text DEFAULT 'Facturee' CHECK (statut IN ('Devis', 'Commande', 'Facturee', 'Annulee')),
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventes_filiale_date ON ventes(filiale_id, date_vente);
CREATE INDEX IF NOT EXISTS idx_ventes_commercial ON ventes(commercial_id);
CREATE INDEX IF NOT EXISTS idx_ventes_mois ON ventes(mois_vente);

CREATE TABLE IF NOT EXISTS ventes_perdues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  article_id uuid REFERENCES articles(id),
  categorie_produit text,
  client_potentiel text NOT NULL,
  pays text,
  montant_estime numeric(15,2),
  date_opportunite date DEFAULT CURRENT_DATE,
  mois_perte text,
  annee integer,
  motif_perte text CHECK (motif_perte IN ('Prix', 'Delai', 'Concurrent', 'Produit_inadequat', 'Budget_client', 'Autre')),
  concurrent text,
  commercial_id uuid REFERENCES auth.users(id),
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventes_perdues_filiale ON ventes_perdues(filiale_id);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_motif ON ventes_perdues(motif_perte);

CREATE TABLE IF NOT EXISTS forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  mois text NOT NULL,
  annee integer NOT NULL,
  montant_prevu numeric(15,2) NOT NULL,
  base_budget numeric(15,2),
  base_commandes numeric(15,2),
  ajustement_gm numeric(15,2) DEFAULT 0,
  montant_final numeric(15,2),
  modifiable_gm boolean DEFAULT true,
  commentaire_gm text,
  modifie_par_id uuid REFERENCES auth.users(id),
  date_modification timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(filiale_id, mois, annee)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_filiale_periode ON forecasts(filiale_id, annee, mois);

-- =====================================================
-- 5. GESTION TECHNIQUE
-- =====================================================

CREATE TABLE IF NOT EXISTS parc_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_serie text UNIQUE NOT NULL,
  article_id uuid REFERENCES articles(id),
  marque text NOT NULL,
  modele text NOT NULL,
  annee_fabrication integer,
  client_nom text NOT NULL,
  pays text NOT NULL,
  ville text,
  coordonnees_gps text,
  date_vente date,
  filiale_vendeur_id uuid REFERENCES filiales(id),
  vente_id uuid REFERENCES ventes(id),
  statut text DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Inactif', 'Vendu_occasion', 'Hors_service')),
  date_derniere_inspection date,
  commentaires text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parc_pays ON parc_machines(pays);
CREATE INDEX IF NOT EXISTS idx_parc_filiale ON parc_machines(filiale_vendeur_id);
CREATE INDEX IF NOT EXISTS idx_parc_marque ON parc_machines(marque);

CREATE TABLE IF NOT EXISTS inspections_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  machine_id uuid NOT NULL REFERENCES parc_machines(id),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  technicien_id uuid NOT NULL REFERENCES auth.users(id),
  date_inspection date DEFAULT CURRENT_DATE,
  type_inspection text CHECK (type_inspection IN ('Maintenance', 'Reparation', 'Diagnostic', 'Garantie')),
  heures_compteur numeric(10,1),
  anomalies_detectees text[],
  pieces_recommandees text[],
  devis_genere boolean DEFAULT false,
  montant_devis numeric(15,2),
  statut_devis text CHECK (statut_devis IN ('A_etablir', 'Envoye', 'Accepte', 'Refuse', 'Null')),
  commentaires text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_filiale ON inspections_techniques(filiale_id);
CREATE INDEX IF NOT EXISTS idx_inspections_technicien ON inspections_techniques(technicien_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections_techniques(date_inspection);

-- =====================================================
-- 6. BUDGETS
-- =====================================================

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  annee integer NOT NULL,
  mois text,
  type_budget text NOT NULL CHECK (type_budget IN ('Ventes_machines', 'Ventes_pieces', 'Ventes_services', 'Charges', 'Investissements')),
  montant numeric(15,2) NOT NULL,
  devise text DEFAULT 'EUR',
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_filiale_annee ON budgets(filiale_id, annee);

-- =====================================================
-- 7. AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'REOPEN', 'VALIDATE')),
  old_values jsonb,
  new_values jsonb,
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);

-- =====================================================
-- 8. TRIGGERS POUR CALCULS AUTOMATIQUES
-- =====================================================

-- Trigger pour calculer prix_revient dans entrees_stock
CREATE OR REPLACE FUNCTION calculate_prix_revient()
RETURNS TRIGGER AS $$
BEGIN
  NEW.prix_revient := NEW.prix_achat_ht * NEW.coefficient_prix_revient;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_prix_revient
  BEFORE INSERT OR UPDATE ON entrees_stock
  FOR EACH ROW
  EXECUTE FUNCTION calculate_prix_revient();

-- Trigger pour calculer marge dans ventes
CREATE OR REPLACE FUNCTION calculate_marge_vente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prix_revient IS NOT NULL THEN
    NEW.marge := NEW.prix_vente_ht - NEW.prix_revient;
    IF NEW.prix_revient > 0 THEN
      NEW.taux_marge := ((NEW.prix_vente_ht - NEW.prix_revient) / NEW.prix_revient * 100);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_marge_vente
  BEFORE INSERT OR UPDATE ON ventes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_marge_vente();

-- Trigger pour calculer montant_final dans forecasts
CREATE OR REPLACE FUNCTION calculate_montant_final_forecast()
RETURNS TRIGGER AS $$
BEGIN
  NEW.montant_final := NEW.montant_prevu + COALESCE(NEW.ajustement_gm, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_montant_final_forecast
  BEFORE INSERT OR UPDATE ON forecasts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_montant_final_forecast();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE filiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis_reporting ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrees_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_interfiliales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes_perdues ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE parc_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Politiques RLS - FILIALES
CREATE POLICY "Tous peuvent lire filiales"
  ON filiales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins siège gèrent filiales"
  ON filiales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - USERS PROFILES
CREATE POLICY "Users lisent leur profil"
  ON users_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.role = 'manager_filiale' AND up.filiale_id = users_profiles.filiale_id))
    )
  );

CREATE POLICY "Admins siège gèrent profils"
  ON users_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - KPIs REPORTING
CREATE POLICY "Users lisent KPIs de leur filiale"
  ON kpis_reporting FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = kpis_reporting.filiale_id)
    )
  );

CREATE POLICY "Users créent KPIs pour leur filiale"
  ON kpis_reporting FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = kpis_reporting.filiale_id)
    )
  );

CREATE POLICY "Users modifient KPIs non Closed"
  ON kpis_reporting FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.filiale_id = kpis_reporting.filiale_id AND kpis_reporting.status != 'Closed'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.filiale_id = kpis_reporting.filiale_id AND kpis_reporting.status != 'Closed'))
    )
  );

CREATE POLICY "Admins siège suppriment KPIs"
  ON kpis_reporting FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - ARTICLES
CREATE POLICY "Tous lisent articles"
  ON articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers gèrent articles"
  ON articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('admin_siege', 'manager_filiale')
    )
  );

-- Politiques RLS - STOCK ITEMS
CREATE POLICY "Users lisent stock de leur filiale"
  ON stock_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = stock_items.filiale_id)
    )
  );

CREATE POLICY "Users gèrent stock de leur filiale"
  ON stock_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = stock_items.filiale_id)
    )
  );

-- Politiques RLS - COMMANDES FOURNISSEURS
CREATE POLICY "Users lisent commandes de leur filiale"
  ON commandes_fournisseurs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_fournisseurs.filiale_id)
    )
  );

CREATE POLICY "Users gèrent commandes de leur filiale"
  ON commandes_fournisseurs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = commandes_fournisseurs.filiale_id)
    )
  );

-- Politiques RLS - LIGNES COMMANDES
CREATE POLICY "Users lisent lignes commandes de leur filiale"
  ON lignes_commandes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes_fournisseurs cf
      JOIN users_profiles up ON (up.id = auth.uid())
      WHERE cf.id = lignes_commandes.commande_id
      AND (up.role = 'admin_siege' OR up.filiale_id = cf.filiale_id)
    )
  );

CREATE POLICY "Users gèrent lignes commandes de leur filiale"
  ON lignes_commandes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes_fournisseurs cf
      JOIN users_profiles up ON (up.id = auth.uid())
      WHERE cf.id = lignes_commandes.commande_id
      AND (up.role = 'admin_siege' OR up.filiale_id = cf.filiale_id)
    )
  );

-- Politiques RLS - ENTRÉES STOCK
CREATE POLICY "Users lisent entrées stock de leur filiale"
  ON entrees_stock FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
    )
  );

CREATE POLICY "Users créent entrées stock pour leur filiale"
  ON entrees_stock FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
    )
  );

CREATE POLICY "Managers valident entrées stock"
  ON entrees_stock FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = entrees_stock.filiale_id)
    )
  );

-- Politiques RLS - SESSIONS INTERFILIALES
CREATE POLICY "Users lisent sessions de leur filiale"
  ON sessions_interfiliales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id IN (sessions_interfiliales.filiale_origine_id, sessions_interfiliales.filiale_destination_id))
    )
  );

CREATE POLICY "Users créent sessions depuis leur filiale"
  ON sessions_interfiliales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = sessions_interfiliales.filiale_origine_id)
    )
  );

CREATE POLICY "Managers valident sessions"
  ON sessions_interfiliales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id IN (sessions_interfiliales.filiale_origine_id, sessions_interfiliales.filiale_destination_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id IN (sessions_interfiliales.filiale_origine_id, sessions_interfiliales.filiale_destination_id))
    )
  );

-- Politiques RLS - VENTES
CREATE POLICY "Users lisent ventes de leur filiale"
  ON ventes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id OR (up.role = 'commercial' AND up.id = ventes.commercial_id))
    )
  );

CREATE POLICY "Commerciaux créent ventes"
  ON ventes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  );

CREATE POLICY "Users modifient ventes de leur filiale"
  ON ventes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes.filiale_id)
    )
  );

-- Politiques RLS - VENTES PERDUES
CREATE POLICY "Users lisent ventes perdues de leur filiale"
  ON ventes_perdues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id OR (up.role = 'commercial' AND up.id = ventes_perdues.commercial_id))
    )
  );

CREATE POLICY "Commerciaux déclarent ventes perdues"
  ON ventes_perdues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  );

CREATE POLICY "Users modifient ventes perdues de leur filiale"
  ON ventes_perdues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = ventes_perdues.filiale_id)
    )
  );

-- Politiques RLS - FORECASTS
CREATE POLICY "Users lisent forecasts de leur filiale"
  ON forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = forecasts.filiale_id)
    )
  );

CREATE POLICY "Managers créent forecasts"
  ON forecasts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale')
      AND (up.role = 'admin_siege' OR up.filiale_id = forecasts.filiale_id)
    )
  );

CREATE POLICY "Admins siège modifient forecasts"
  ON forecasts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.role = 'manager_filiale' AND up.filiale_id = forecasts.filiale_id AND forecasts.modifiable_gm = true))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.role = 'manager_filiale' AND up.filiale_id = forecasts.filiale_id AND forecasts.modifiable_gm = true))
    )
  );

-- Politiques RLS - PARC MACHINES
CREATE POLICY "Users lisent parc machines"
  ON parc_machines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = parc_machines.filiale_vendeur_id)
    )
  );

CREATE POLICY "Users gèrent parc machines de leur filiale"
  ON parc_machines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = parc_machines.filiale_vendeur_id)
    )
  );

-- Politiques RLS - INSPECTIONS TECHNIQUES
CREATE POLICY "Users lisent inspections de leur filiale"
  ON inspections_techniques FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = inspections_techniques.filiale_id OR (up.role = 'technicien' AND up.id = inspections_techniques.technicien_id))
    )
  );

CREATE POLICY "Techniciens créent inspections"
  ON inspections_techniques FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('admin_siege', 'manager_filiale', 'technicien')
      AND (up.role = 'admin_siege' OR up.filiale_id = inspections_techniques.filiale_id)
    )
  );

CREATE POLICY "Techniciens modifient leurs inspections"
  ON inspections_techniques FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.filiale_id = inspections_techniques.filiale_id AND up.role IN ('manager_filiale', 'technicien')))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR (up.filiale_id = inspections_techniques.filiale_id AND up.role IN ('manager_filiale', 'technicien')))
    )
  );

-- Politiques RLS - BUDGETS
CREATE POLICY "Users lisent budgets de leur filiale"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND (up.role = 'admin_siege' OR up.filiale_id = budgets.filiale_id)
    )
  );

CREATE POLICY "Admins siège gèrent budgets"
  ON budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
    )
  );

-- Politiques RLS - AUDIT LOG
CREATE POLICY "Admins siège lisent audit"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin_siege'
    )
  );

CREATE POLICY "Système insère audit"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
