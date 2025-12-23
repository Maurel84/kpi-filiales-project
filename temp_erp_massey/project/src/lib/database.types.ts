export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      filiales: {
        Row: {
          id: string
          code: string
          nom: string
          pays: string
          devise: string
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          nom: string
          pays: string
          devise?: string
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          nom?: string
          pays?: string
          devise?: string
          actif?: boolean
          created_at?: string
        }
      }
      users_profiles: {
        Row: {
          id: string
          filiale_id: string | null
          role: 'admin_siege' | 'manager_filiale' | 'commercial' | 'technicien' | 'saisie'
          poste: string | null
          prenom: string | null
          nom: string | null
          email: string | null
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          filiale_id?: string | null
          role: 'admin_siege' | 'manager_filiale' | 'commercial' | 'technicien' | 'saisie'
          poste?: string | null
          prenom?: string | null
          nom?: string | null
          email?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          role?: 'admin_siege' | 'manager_filiale' | 'commercial' | 'technicien' | 'saisie'
          poste?: string | null
          prenom?: string | null
          nom?: string | null
          email?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      kpis_reporting: {
        Row: {
          id: string
          title: string | null
          filiale_id: string
          type_kpi: 'Production' | 'Rendement' | 'Heures' | 'Couts' | 'Manutention' | 'Agriculture' | 'RH' | 'Financier' | 'Autre'
          date_entree: string
          mois_cloture: string
          annee: number
          ligne: number | null
          valeur: number | null
          unite: string | null
          commentaires: string | null
          responsable_saisie_id: string | null
          status: 'Draft' | 'Submitted' | 'Approved' | 'Closed' | 'Reopened_by_Mgmt'
          valide_par_id: string | null
          date_validation: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          modified_by: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          filiale_id: string
          type_kpi: 'Production' | 'Rendement' | 'Heures' | 'Couts' | 'Manutention' | 'Agriculture' | 'RH' | 'Financier' | 'Autre'
          date_entree?: string
          mois_cloture: string
          annee: number
          ligne?: number | null
          valeur?: number | null
          unite?: string | null
          commentaires?: string | null
          responsable_saisie_id?: string | null
          status?: 'Draft' | 'Submitted' | 'Approved' | 'Closed' | 'Reopened_by_Mgmt'
          valide_par_id?: string | null
          date_validation?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          modified_by?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          filiale_id?: string
          type_kpi?: 'Production' | 'Rendement' | 'Heures' | 'Couts' | 'Manutention' | 'Agriculture' | 'RH' | 'Financier' | 'Autre'
          date_entree?: string
          mois_cloture?: string
          annee?: number
          ligne?: number | null
          valeur?: number | null
          unite?: string | null
          commentaires?: string | null
          responsable_saisie_id?: string | null
          status?: 'Draft' | 'Submitted' | 'Approved' | 'Closed' | 'Reopened_by_Mgmt'
          valide_par_id?: string | null
          date_validation?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          modified_by?: string | null
        }
      }
      articles: {
        Row: {
          id: string
          reference: string
          libelle: string
          categorie: 'Machine' | 'Piece' | 'Consommable' | 'Service' | null
          marque: string | null
          modele: string | null
          prix_achat_ht: number | null
          coefficient_prix_revient: number | null
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          reference: string
          libelle: string
          categorie?: 'Machine' | 'Piece' | 'Consommable' | 'Service' | null
          marque?: string | null
          modele?: string | null
          prix_achat_ht?: number | null
          coefficient_prix_revient?: number | null
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string
          libelle?: string
          categorie?: 'Machine' | 'Piece' | 'Consommable' | 'Service' | null
          marque?: string | null
          modele?: string | null
          prix_achat_ht?: number | null
          coefficient_prix_revient?: number | null
          actif?: boolean
          created_at?: string
        }
      }
      stock_items: {
        Row: {
          id: string
          article_id: string
          filiale_id: string
          numero_serie: string | null
          quantite: number
          emplacement: string | null
          date_entree: string
          prix_achat_ht: number | null
          prix_revient: number | null
          statut: 'Disponible' | 'Reserve' | 'Vendu' | 'Transfert' | 'Obsolete'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id: string
          filiale_id: string
          numero_serie?: string | null
          quantite?: number
          emplacement?: string | null
          date_entree?: string
          prix_achat_ht?: number | null
          prix_revient?: number | null
          statut?: 'Disponible' | 'Reserve' | 'Vendu' | 'Transfert' | 'Obsolete'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          filiale_id?: string
          numero_serie?: string | null
          quantite?: number
          emplacement?: string | null
          date_entree?: string
          prix_achat_ht?: number | null
          prix_revient?: number | null
          statut?: 'Disponible' | 'Reserve' | 'Vendu' | 'Transfert' | 'Obsolete'
          created_at?: string
          updated_at?: string
        }
      }
      ventes: {
        Row: {
          id: string
          numero: string
          filiale_id: string
          article_id: string
          stock_item_id: string | null
          client_nom: string
          client_pays: string | null
          numero_serie: string | null
          quantite: number
          prix_vente_ht: number
          prix_revient: number | null
          marge: number | null
          taux_marge: number | null
          date_vente: string
          mois_vente: string | null
          annee: number | null
          commercial_id: string | null
          statut: 'Devis' | 'Commande' | 'Facturee' | 'Annulee'
          commentaires: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          numero: string
          filiale_id: string
          article_id: string
          stock_item_id?: string | null
          client_nom: string
          client_pays?: string | null
          numero_serie?: string | null
          quantite: number
          prix_vente_ht: number
          prix_revient?: number | null
          marge?: number | null
          taux_marge?: number | null
          date_vente?: string
          mois_vente?: string | null
          annee?: number | null
          commercial_id?: string | null
          statut?: 'Devis' | 'Commande' | 'Facturee' | 'Annulee'
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          numero?: string
          filiale_id?: string
          article_id?: string
          stock_item_id?: string | null
          client_nom?: string
          client_pays?: string | null
          numero_serie?: string | null
          quantite?: number
          prix_vente_ht?: number
          prix_revient?: number | null
          marge?: number | null
          taux_marge?: number | null
          date_vente?: string
          mois_vente?: string | null
          annee?: number | null
          commercial_id?: string | null
          statut?: 'Devis' | 'Commande' | 'Facturee' | 'Annulee'
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      ventes_perdues: {
        Row: {
          id: string
          filiale_id: string
          article_id: string | null
          categorie_produit: string | null
          client_potentiel: string
          pays: string | null
          montant_estime: number | null
          date_opportunite: string
          mois_perte: string | null
          annee: number | null
          motif_perte: 'Prix' | 'Delai' | 'Concurrent' | 'Produit_inadequat' | 'Budget_client' | 'Autre' | null
          concurrent: string | null
          commercial_id: string | null
          commentaires: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          filiale_id: string
          article_id?: string | null
          categorie_produit?: string | null
          client_potentiel: string
          pays?: string | null
          montant_estime?: number | null
          date_opportunite?: string
          mois_perte?: string | null
          annee?: number | null
          motif_perte?: 'Prix' | 'Delai' | 'Concurrent' | 'Produit_inadequat' | 'Budget_client' | 'Autre' | null
          concurrent?: string | null
          commercial_id?: string | null
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string
          article_id?: string | null
          categorie_produit?: string | null
          client_potentiel?: string
          pays?: string | null
          montant_estime?: number | null
          date_opportunite?: string
          mois_perte?: string | null
          annee?: number | null
          motif_perte?: 'Prix' | 'Delai' | 'Concurrent' | 'Produit_inadequat' | 'Budget_client' | 'Autre' | null
          concurrent?: string | null
          commercial_id?: string | null
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      parc_machines: {
        Row: {
          id: string
          numero_serie: string
          article_id: string | null
          marque: string
          modele: string
          annee_fabrication: number | null
          client_nom: string
          pays: string
          ville: string | null
          coordonnees_gps: string | null
          date_vente: string | null
          filiale_vendeur_id: string | null
          vente_id: string | null
          statut: 'Actif' | 'Inactif' | 'Vendu_occasion' | 'Hors_service'
          date_derniere_inspection: string | null
          commentaires: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero_serie: string
          article_id?: string | null
          marque: string
          modele: string
          annee_fabrication?: number | null
          client_nom: string
          pays: string
          ville?: string | null
          coordonnees_gps?: string | null
          date_vente?: string | null
          filiale_vendeur_id?: string | null
          vente_id?: string | null
          statut?: 'Actif' | 'Inactif' | 'Vendu_occasion' | 'Hors_service'
          date_derniere_inspection?: string | null
          commentaires?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_serie?: string
          article_id?: string | null
          marque?: string
          modele?: string
          annee_fabrication?: number | null
          client_nom?: string
          pays?: string
          ville?: string | null
          coordonnees_gps?: string | null
          date_vente?: string | null
          filiale_vendeur_id?: string | null
          vente_id?: string | null
          statut?: 'Actif' | 'Inactif' | 'Vendu_occasion' | 'Hors_service'
          date_derniere_inspection?: string | null
          commentaires?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inspections_techniques: {
        Row: {
          id: string
          numero: string
          machine_id: string
          filiale_id: string
          technicien_id: string
          date_inspection: string
          type_inspection: 'Maintenance' | 'Reparation' | 'Diagnostic' | 'Garantie' | null
          heures_compteur: number | null
          anomalies_detectees: string[] | null
          pieces_recommandees: string[] | null
          devis_genere: boolean
          montant_devis: number | null
          statut_devis: 'A_etablir' | 'Envoye' | 'Accepte' | 'Refuse' | 'Null' | null
          commentaires: string | null
          created_at: string
        }
        Insert: {
          id?: string
          numero: string
          machine_id: string
          filiale_id: string
          technicien_id: string
          date_inspection?: string
          type_inspection?: 'Maintenance' | 'Reparation' | 'Diagnostic' | 'Garantie' | null
          heures_compteur?: number | null
          anomalies_detectees?: string[] | null
          pieces_recommandees?: string[] | null
          devis_genere?: boolean
          montant_devis?: number | null
          statut_devis?: 'A_etablir' | 'Envoye' | 'Accepte' | 'Refuse' | 'Null' | null
          commentaires?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          numero?: string
          machine_id?: string
          filiale_id?: string
          technicien_id?: string
          date_inspection?: string
          type_inspection?: 'Maintenance' | 'Reparation' | 'Diagnostic' | 'Garantie' | null
          heures_compteur?: number | null
          anomalies_detectees?: string[] | null
          pieces_recommandees?: string[] | null
          devis_genere?: boolean
          montant_devis?: number | null
          statut_devis?: 'A_etablir' | 'Envoye' | 'Accepte' | 'Refuse' | 'Null' | null
          commentaires?: string | null
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          filiale_id: string
          annee: number
          mois: string | null
          type_budget: 'Ventes_machines' | 'Ventes_pieces' | 'Ventes_services' | 'Charges' | 'Investissements'
          montant: number
          devise: string
          commentaires: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filiale_id: string
          annee: number
          mois?: string | null
          type_budget: 'Ventes_machines' | 'Ventes_pieces' | 'Ventes_services' | 'Charges' | 'Investissements'
          montant: number
          devise?: string
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string
          annee?: number
          mois?: string | null
          type_budget?: 'Ventes_machines' | 'Ventes_pieces' | 'Ventes_services' | 'Charges' | 'Investissements'
          montant?: number
          devise?: string
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      forecasts: {
        Row: {
          id: string
          filiale_id: string
          mois: string
          annee: number
          montant_prevu: number
          base_budget: number | null
          base_commandes: number | null
          ajustement_gm: number | null
          montant_final: number | null
          modifiable_gm: boolean
          commentaire_gm: string | null
          modifie_par_id: string | null
          date_modification: string | null
          created_at: string
        }
        Insert: {
          id?: string
          filiale_id: string
          mois: string
          annee: number
          montant_prevu: number
          base_budget?: number | null
          base_commandes?: number | null
          ajustement_gm?: number | null
          montant_final?: number | null
          modifiable_gm?: boolean
          commentaire_gm?: string | null
          modifie_par_id?: string | null
          date_modification?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string
          mois?: string
          annee?: number
          montant_prevu?: number
          base_budget?: number | null
          base_commandes?: number | null
          ajustement_gm?: number | null
          montant_final?: number | null
          modifiable_gm?: boolean
          commentaire_gm?: string | null
          modifie_par_id?: string | null
          date_modification?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
