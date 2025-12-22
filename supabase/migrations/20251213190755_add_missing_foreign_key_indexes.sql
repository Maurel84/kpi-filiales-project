/*
  # Add Missing Foreign Key Indexes

  ## Overview
  This migration adds indexes on all foreign key columns to improve query performance.
  Missing indexes on foreign keys can cause significant performance degradation.

  ## Changes
  Adds indexes for 43 foreign key columns across 19 tables

  ## Performance Impact
  - Dramatically improves JOIN performance
  - Speeds up cascading deletes/updates
  - Reduces query execution time for filtered queries
*/

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);

-- Commandes Clients
CREATE INDEX IF NOT EXISTS idx_commandes_clients_created_by ON commandes_clients(created_by_id);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_marque ON commandes_clients(marque_id);

-- Commandes Fournisseurs  
CREATE INDEX IF NOT EXISTS idx_commandes_fournisseurs_created_by ON commandes_fournisseurs(created_by);
CREATE INDEX IF NOT EXISTS idx_commandes_fournisseurs_filiale ON commandes_fournisseurs(filiale_id);

-- Entrees Stock
CREATE INDEX IF NOT EXISTS idx_entrees_stock_article ON entrees_stock(article_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_commande ON entrees_stock(commande_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_created_by ON entrees_stock(created_by);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_filiale ON entrees_stock(filiale_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_ligne_commande ON entrees_stock(ligne_commande_id);
CREATE INDEX IF NOT EXISTS idx_entrees_stock_valide_par ON entrees_stock(valide_par_id);

-- Forecasts
CREATE INDEX IF NOT EXISTS idx_forecasts_modifie_par ON forecasts(modifie_par_id);

-- Historique Ventes Modeles
CREATE INDEX IF NOT EXISTS idx_hist_ventes_categorie ON historique_ventes_modeles(categorie_id);
CREATE INDEX IF NOT EXISTS idx_hist_ventes_marque ON historique_ventes_modeles(marque_id);

-- Inspections Techniques
CREATE INDEX IF NOT EXISTS idx_inspections_machine ON inspections_techniques(machine_id);

-- KPIs Reporting
CREATE INDEX IF NOT EXISTS idx_kpis_created_by ON kpis_reporting(created_by);
CREATE INDEX IF NOT EXISTS idx_kpis_modified_by ON kpis_reporting(modified_by);
CREATE INDEX IF NOT EXISTS idx_kpis_responsable_saisie ON kpis_reporting(responsable_saisie_id);
CREATE INDEX IF NOT EXISTS idx_kpis_valide_par ON kpis_reporting(valide_par_id);

-- Lignes Commandes
CREATE INDEX IF NOT EXISTS idx_lignes_commandes_article ON lignes_commandes(article_id);
CREATE INDEX IF NOT EXISTS idx_lignes_commandes_commande ON lignes_commandes(commande_id);

-- Opportunites
CREATE INDEX IF NOT EXISTS idx_opportunites_created_by ON opportunites(created_by_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_visite ON opportunites(visite_id);

-- Parc Machines
CREATE INDEX IF NOT EXISTS idx_parc_machines_article ON parc_machines(article_id);
CREATE INDEX IF NOT EXISTS idx_parc_machines_vente ON parc_machines(vente_id);
CREATE INDEX IF NOT EXISTS idx_parc_machines_filiale_vendeur ON parc_machines(filiale_vendeur_id);

-- PDM Entries
CREATE INDEX IF NOT EXISTS idx_pdm_entries_categorie ON pdm_entries(categorie_id);
CREATE INDEX IF NOT EXISTS idx_pdm_entries_created_by ON pdm_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_pdm_entries_modele ON pdm_entries(modele_id);

-- Plan Actions
CREATE INDEX IF NOT EXISTS idx_plan_actions_created_by ON plan_actions(created_by);

-- Previsions Ventes Modeles
CREATE INDEX IF NOT EXISTS idx_prev_ventes_categorie ON previsions_ventes_modeles(categorie_id);
CREATE INDEX IF NOT EXISTS idx_prev_ventes_marque ON previsions_ventes_modeles(marque_id);
CREATE INDEX IF NOT EXISTS idx_prev_ventes_modifie_par ON previsions_ventes_modeles(modifie_par_id);

-- Sessions Interfiliales
CREATE INDEX IF NOT EXISTS idx_sessions_article ON sessions_interfiliales(article_id);
CREATE INDEX IF NOT EXISTS idx_sessions_demande_par ON sessions_interfiliales(demande_par_id);
CREATE INDEX IF NOT EXISTS idx_sessions_stock_item ON sessions_interfiliales(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_sessions_valide_destination ON sessions_interfiliales(valide_destination_par_id);
CREATE INDEX IF NOT EXISTS idx_sessions_valide_origine ON sessions_interfiliales(valide_origine_par_id);

-- Users Profiles
CREATE INDEX IF NOT EXISTS idx_users_profiles_filiale ON users_profiles(filiale_id);

-- Ventes
CREATE INDEX IF NOT EXISTS idx_ventes_article ON ventes(article_id);
CREATE INDEX IF NOT EXISTS idx_ventes_created_by ON ventes(created_by);
CREATE INDEX IF NOT EXISTS idx_ventes_stock_item ON ventes(stock_item_id);

-- Ventes Perdues
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_article ON ventes_perdues(article_id);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_commercial ON ventes_perdues(commercial_id);
CREATE INDEX IF NOT EXISTS idx_ventes_perdues_created_by ON ventes_perdues(created_by);
