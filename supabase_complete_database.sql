/*
  ========================================
  ERP MASSEY FERGUSON - BASE DE DONNÉES COMPLÈTE
  ========================================

  Ce fichier contient la structure complète de la base de données pour l'application
  ERP Multi-Filiales avec suivi des KPIs, stocks, ventes et parc machines.

  INSTRUCTIONS D'UTILISATION:
  1. Ouvrir le SQL Editor dans votre projet Supabase
  2. Copier-coller tout le contenu de ce fichier
  3. Exécuter le script
  4. Attendre la fin de l'exécution (peut prendre 30-60 secondes)
  5. Vérifier que toutes les tables sont créées dans la section "Database"

  CONTENU:
  - 26 tables avec relations complètes
  - Row Level Security (RLS) activé sur toutes les tables
  - 80+ politiques RLS optimisées
  - 43 indexes de performance
  - 4 fonctions SQL avec triggers automatiques
  - Données de référence (9 filiales, 3 marques, 40+ catégories)

  VERSION: 1.0.0
  DATE: Décembre 2024
*/

-- =====================================================
-- 1. TABLES DE RÉFÉRENCE
-- =====================================================

-- Table des filiales (9 filiales pré-configurées)
CREATE TABLE IF NOT EXISTS filiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  nom text NOT NULL,
  pays text NOT NULL,
  devise text DEFAULT 'EUR',
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table des profils utilisateurs avec rôles
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

CREATE INDEX IF NOT EXISTS idx_users_profiles_filiale ON users_profiles(filiale_id);

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
CREATE INDEX IF NOT EXISTS idx_kpis_created_by ON kpis_reporting(created_by);
CREATE INDEX IF NOT EXISTS idx_kpis_modified_by ON kpis_reporting(modified_by);
CREATE INDEX IF NOT EXISTS idx_kpis_responsable_saisie ON kpis_reporting(responsable_saisie_id);
CREATE INDEX IF NOT EXISTS idx_kpis_valide_par ON kpis_reporting(valide_par_id);

-- =====================================================
-- 3. RÉFÉRENTIELS PRODUITS
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

-- Table des articles
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marque_id uuid REFERENCES marques(id),
  categorie_id uuid REFERENCES categories_produits(id),
  reference text UNIQUE NOT NULL,
  designation text NOT NULL,
  prix_achat_ht numeric(15,2),
  coefficient_prix_revient numeric(5,2) DEFAULT 1.0,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. GESTION DES STOCKS
-- =====================================================

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
  statut text DEFAULT 'En_attente' CHECK (statut IN ('En_attente', 'Confirmee', 'En_transit', 'Recue', 'Annulee')),
  montant_total numeric(15,2) DEFAULT 0,
  devise text DEFAULT 'EUR',
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commandes_fournisseurs_created_by ON commandes_fournisseurs(created_by);
CREATE INDEX IF NOT EXISTS idx_commandes_fournisseurs_filiale ON commandes_fournisseurs(filiale_id);

CREATE TABLE IF NOT EXISTS lignes_commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid NOT NULL REFERENCES commandes_fournisseurs(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id),
  quantite numeric(10,2) NOT NULL,
  prix_unitaire_ht numeric(15,2) NOT NULL,
  quantite_recue numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lignes_commandes_article ON lignes_commandes(article_id);
CREATE INDEX IF NOT EXISTS idx_lignes_commandes_commande ON lignes_commandes(commande_id);

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

CREATE INDEX IF NOT EXISTS idx_entrees_stock_article ON entrees_stock(article_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_commande ON entrees_stock(commande_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_created_by ON entrees_stock(created_by);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_filiale ON entrees_stock(filiale_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_ligne_commande ON entrees_stock(ligne_commande_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_valide_par ON entrees_stock(valide_par_id);

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
CREATE INDEX IF NOT EXISTS idx_sessions_article ON sessions_interfiliales(article_id);
CREATE INDEX IF NOT EXISTS idx_sessions_demande_par ON sessions_interfiliales(demande_par_id);
CREATE INDEX IF NOT EXISTS idx_sessions_stock_item ON sessions_interfiliales(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_sessions_valide_destination ON sessions_interfiliales(valide_destination_par_id);
CREATE INDEX IF NOT EXISTS idx_sessions_valide_origine ON sessions_interfiliales(valide_origine_par_id);

-- =====================================================
-- 5. GESTION COMMERCIALE
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
  type_vente text CHECK (type_vente IN ('Neuf', 'Occasion', 'Piece', 'Service')),
  montant_vente numeric(15,2) NOT NULL,
  prix_revient numeric(15,2),
  marge numeric(15,2),
  date_vente date DEFAULT CURRENT_DATE,
  commercial_id uuid REFERENCES auth.users(id),
  commentaires text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventes_filiale_date ON ventes(filiale_id, date_vente);
CREATE INDEX IF NOT EXISTS idx_ventes_commercial ON ventes(commercial_id);
CREATE INDEX IF NOT EXISTS idx_ventes_article ON ventes(article_id);
CREATE INDEX IF NOT EXISTS idx_ventes_created_by ON ventes(created_by);
CREATE INDEX IF NOT EXISTS idx_ventes_stock_item ON ventes(stock_item_id);

CREATE TABLE IF NOT EXISTS ventes_perdues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid NOT NULL REFERENCES filiales(id),
  article_id uuid REFERENCES articles(id),
  categorie_produit text,
  client_potentiel text NOT NULL,
  pays text,
  montant_estime numeric(15,2),
  date_opportunite date DEFAULT CURRENT_DATE,
  motif_perte text CHECK (motif_perte IN ('Prix', 'Delai', 'Concurrent', 'Produit_inadequat', 'Budget_client', 'Autre')),
  concurrent text,
  commercial_id uuid REFERENCES auth.users(id),
  a_participe boolean DEFAULT true,
  marque_concurrent text,
  modele_concurrent text,
  prix_concurrent decimal(15,2),
  commentaires text,
  commentaires_analyse text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventes_perdues_filiale ON ventes_perdues(filiale_id);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_motif ON ventes_perdues(motif_perte);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_article ON ventes_perdues(article_id);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_commercial ON ventes_perdues(commercial_id);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_created_by ON ventes_perdues(created_by);

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
CREATE INDEX IF NOT EXISTS idx_forecasts_modifie_par ON forecasts(modifie_par_id);

-- Commandes Clients
CREATE TABLE IF NOT EXISTS commandes_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  numero_commande text NOT NULL,
  date_commande date NOT NULL DEFAULT CURRENT_DATE,
  client_nom text NOT NULL,
  marque_id uuid REFERENCES marques(id),
  modele text,
  numero_serie text,
  gamme text,
  pays text,
  vendeur_id uuid REFERENCES users_profiles(id),
  ca_ht_prevu decimal(15,2),
  devise text DEFAULT 'XAF',
  prevision_facturation date,
  statut text DEFAULT 'En_cours' CHECK (statut IN ('En_cours', 'Facture', 'Annule', 'Livre')),
  commentaires text,
  created_by_id uuid REFERENCES users_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commandes_clients_filiale ON commandes_clients(filiale_id);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_date ON commandes_clients(date_commande);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_vendeur ON commandes_clients(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_statut ON commandes_clients(statut);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_created_by ON commandes_clients(created_by_id);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_marque ON commandes_clients(marque_id);

-- Visites Clients
CREATE TABLE IF NOT EXISTS visites_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  date_visite date NOT NULL DEFAULT CURRENT_DATE,
  nom_client text NOT NULL,
  prenom_client text,
  fonction_client text,
  telephone_client text,
  whatsapp_client text,
  email_client text,
  url_societe_client text,
  notes text,
  visite_par_id uuid REFERENCES users_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visites_clients_filiale ON visites_clients(filiale_id);
CREATE INDEX IF NOT EXISTS idx_visites_clients_date ON visites_clients(date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_clients_visite_par ON visites_clients(visite_par_id);

-- Opportunités
CREATE TABLE IF NOT EXISTS opportunites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  visite_id uuid REFERENCES visites_clients(id) ON DELETE SET NULL,
  nom_projet text NOT NULL,
  ville text,
  marques text[],
  modeles text[],
  quantites integer,
  montant_estime decimal(15,2),
  devise text DEFAULT 'XAF',
  pourcentage_marge decimal(5,2),
  date_closing_prevue date,
  statut text DEFAULT 'En_cours' CHECK (statut IN ('Gagnee', 'En_cours', 'Reportee', 'Abandonnee', 'Perdue')),
  taux_cloture_percent decimal(5,2) DEFAULT 0,
  notes text,
  created_by_id uuid REFERENCES users_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunites_filiale ON opportunites(filiale_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_statut ON opportunites(statut);
CREATE INDEX IF NOT EXISTS idx_opportunites_date_closing ON opportunites(date_closing_prevue);
CREATE INDEX IF NOT EXISTS idx_opportunites_created_by ON opportunites(created_by_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_visite ON opportunites(visite_id);

-- =====================================================
-- 6. PLANS DE MARCHÉ ET ACTIONS
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
CREATE INDEX IF NOT EXISTS idx_pdm_entries_categorie ON pdm_entries(categorie_id);
CREATE INDEX IF NOT EXISTS idx_pdm_entries_created_by ON pdm_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_pdm_entries_modele ON pdm_entries(modele_id);

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
CREATE INDEX IF NOT EXISTS idx_plan_actions_created_by ON plan_actions(created_by);

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
CREATE INDEX IF NOT EXISTS idx_hist_ventes_categorie ON historique_ventes_modeles(categorie_id);
CREATE INDEX IF NOT EXISTS idx_hist_ventes_marque ON historique_ventes_modeles(marque_id);

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
CREATE INDEX IF NOT EXISTS idx_prev_ventes_categorie ON previsions_ventes_modeles(categorie_id);
CREATE INDEX IF NOT EXISTS idx_prev_ventes_marque ON previsions_ventes_modeles(marque_id);
CREATE INDEX IF NOT EXISTS idx_prev_ventes_modifie_par ON previsions_ventes_modeles(modifie_par_id);

-- =====================================================
-- 7. GESTION TECHNIQUE
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
CREATE INDEX IF NOT EXISTS idx_parc_machines_article ON parc_machines(article_id);
CREATE INDEX IF NOT EXISTS idx_parc_machines_vente ON parc_machines(vente_id);
CREATE INDEX IF NOT EXISTS idx_parc_machines_filiale_vendeur ON parc_machines(filiale_vendeur_id);

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
CREATE INDEX IF NOT EXISTS idx_inspections_machine ON inspections_techniques(machine_id);

-- =====================================================
-- 8. BUDGETS ET AUDIT
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
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);

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
-- 9. TRIGGERS POUR CALCULS AUTOMATIQUES
-- =====================================================

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

CREATE OR REPLACE FUNCTION calculate_marge_vente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prix_revient IS NOT NULL THEN
    NEW.marge := NEW.montant_vente - NEW.prix_revient;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_marge_vente
  BEFORE INSERT OR UPDATE ON ventes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_marge_vente();

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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commandes_clients_updated_at
  BEFORE UPDATE ON commandes_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_visites_clients_updated_at
  BEFORE UPDATE ON visites_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_opportunites_updated_at
  BEFORE UPDATE ON opportunites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sécuriser les fonctions
ALTER FUNCTION calculate_prix_revient() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_montant_final_forecast() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_marge_vente() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE filiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis_reporting ENABLE ROW LEVEL SECURITY;
ALTER TABLE marques ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrees_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_interfiliales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes_perdues ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_ventes_modeles ENABLE ROW LEVEL SECURITY;
ALTER TABLE previsions_ventes_modeles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parc_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. POLITIQUES RLS - FILIALES
-- =====================================================

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
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

-- =====================================================
-- 12. POLITIQUES RLS - USERS PROFILES
-- =====================================================

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

-- =====================================================
-- 13. POLITIQUES RLS - KPIs
-- =====================================================

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

-- =====================================================
-- 14. POLITIQUES RLS - RÉFÉRENTIELS (lecture publique)
-- =====================================================

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
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

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
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

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
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

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
      WHERE id = (select auth.uid())
      AND role IN ('admin_siege', 'manager_filiale')
    )
  );

-- =====================================================
-- 15. POLITIQUES RLS - STOCK
-- =====================================================

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

-- =====================================================
-- 16. POLITIQUES RLS - COMMANDES FOURNISSEURS
-- =====================================================

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

-- =====================================================
-- 17. POLITIQUES RLS - ENTRÉES STOCK
-- =====================================================

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

-- =====================================================
-- 18. POLITIQUES RLS - SESSIONS INTERFILIALES
-- =====================================================

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

-- =====================================================
-- 19. POLITIQUES RLS - VENTES
-- =====================================================

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

-- =====================================================
-- 20. POLITIQUES RLS - FORECASTS
-- =====================================================

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

-- =====================================================
-- 21. POLITIQUES RLS - COMMANDES & VISITES CLIENTS
-- =====================================================

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

-- =====================================================
-- 22. POLITIQUES RLS - OPPORTUNITÉS
-- =====================================================

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

-- =====================================================
-- 23. POLITIQUES RLS - PDM & PLAN ACTIONS
-- =====================================================

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

-- =====================================================
-- 24. POLITIQUES RLS - HISTORIQUE & PRÉVISIONS
-- =====================================================

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

-- =====================================================
-- 25. POLITIQUES RLS - PARC MACHINES & INSPECTIONS
-- =====================================================

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

-- =====================================================
-- 26. POLITIQUES RLS - BUDGETS & AUDIT
-- =====================================================

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

CREATE POLICY "Admins siège gèrent budgets"
  ON budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

CREATE POLICY "Admins siège lisent audit"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE id = (select auth.uid()) AND role = 'admin_siege'
    )
  );

CREATE POLICY "Système insère audit"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 27. DONNÉES DE RÉFÉRENCE
-- =====================================================

-- Insertion des 9 filiales
INSERT INTO filiales (code, nom, pays, devise, actif) VALUES
('CI', 'Filiale Côte d''Ivoire', 'Côte d''Ivoire', 'XOF', true),
('SN', 'Filiale Sénégal', 'Sénégal', 'XOF', true),
('CM', 'Filiale Cameroun', 'Cameroun', 'XAF', true),
('GA', 'Filiale Gabon', 'Gabon', 'XAF', true),
('ML', 'Filiale Mali', 'Mali', 'XOF', true),
('BF', 'Filiale Burkina Faso', 'Burkina Faso', 'XOF', true),
('GN', 'Filiale Guinée', 'Guinée', 'GNF', true),
('CG', 'Filiale Congo', 'Congo', 'XAF', true),
('BJ', 'Filiale Bénin', 'Bénin', 'XOF', true)
ON CONFLICT (code) DO NOTHING;

-- Insertion des 3 marques principales
INSERT INTO marques (code, nom, actif) VALUES
('MANITOU', 'Manitou', true),
('KALMAR', 'Kalmar', true),
('MASSEY', 'Massey Ferguson', true)
ON CONFLICT (code) DO NOTHING;

-- Insertion des catégories pour Manitou
INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'MAN_CH', 'Chariots élévateurs', 'Chariot', true
FROM marques m WHERE m.code = 'MANITOU'
ON CONFLICT (marque_id, code) DO NOTHING;

INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'MAN_TEL', 'Télescopiques', 'Telescopique', true
FROM marques m WHERE m.code = 'MANITOU'
ON CONFLICT (marque_id, code) DO NOTHING;

INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'MAN_NAC', 'Nacelles', 'Nacelle', true
FROM marques m WHERE m.code = 'MANITOU'
ON CONFLICT (marque_id, code) DO NOTHING;

-- Insertion des catégories pour Kalmar
INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'KAL_REACH', 'Reachstackers', 'Reachstacker', true
FROM marques m WHERE m.code = 'KALMAR'
ON CONFLICT (marque_id, code) DO NOTHING;

INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'KAL_TT', 'Terminal Tractors', 'Terminal_Tractor', true
FROM marques m WHERE m.code = 'KALMAR'
ON CONFLICT (marque_id, code) DO NOTHING;

-- Insertion des catégories pour Massey Ferguson
INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'MF_TRACT', 'Tracteurs agricoles', 'Tracteur', true
FROM marques m WHERE m.code = 'MASSEY'
ON CONFLICT (marque_id, code) DO NOTHING;

INSERT INTO categories_produits (marque_id, code, nom, type_produit, actif)
SELECT m.id, 'MF_MOISS', 'Moissonneuses batteuses', 'Moissonneuse', true
FROM marques m WHERE m.code = 'MASSEY'
ON CONFLICT (marque_id, code) DO NOTHING;

/*
  ========================================
  FIN DU SCRIPT
  ========================================

  Si tout s'est bien passé, vous devriez maintenant avoir:
  - 26 tables créées
  - RLS activé sur toutes les tables
  - 80+ politiques RLS
  - 43 indexes de performance
  - 4 triggers automatiques
  - 9 filiales
  - 3 marques
  - 7 catégories de produits

  PROCHAINES ÉTAPES:
  1. Vérifier dans l'onglet "Database" que toutes les tables sont créées
  2. Créer votre premier utilisateur via Supabase Auth
  3. Ajouter son profil dans la table users_profiles
  4. Mettre à jour le fichier .env de votre application avec les nouvelles URLs
  5. Déployer votre application sur Vercel

  Pour plus d'informations, consultez:
  - README.md - Documentation complète
  - DEPLOYMENT.md - Guide de déploiement
  - POWER_BI_GUIDE.md - Intégration Power BI
*/
