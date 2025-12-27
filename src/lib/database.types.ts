export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DatabaseRelationship = {
  foreignKeyName: string
  columns: string[]
  referencedRelation: string
  referencedColumns: string[]
  isOneToOne?: boolean
}

export type Tables = {
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
      auth_events: {
        Row: {
          id: string
          user_id: string
          event: 'signed_in' | 'signed_out'
          user_agent: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event: 'signed_in' | 'signed_out'
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event?: 'signed_in' | 'signed_out'
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
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
            cible: number | null
            unite: string | null
            commentaires: string | null
            cause_ecart: string | null
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
            cible?: number | null
            unite?: string | null
            commentaires?: string | null
            cause_ecart?: string | null
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
            cible?: number | null
            unite?: string | null
            commentaires?: string | null
            cause_ecart?: string | null
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
      marques: {
        Row: {
          id: string
          code: string
          nom: string
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          nom: string
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          nom?: string
          actif?: boolean
          created_at?: string
        }
      }
      categories_produits: {
        Row: {
          id: string
          marque_id: string | null
          code: string
          nom: string
          type_produit:
            | 'Chariot'
            | 'Telescopique'
            | 'Nacelle'
            | 'Tracteur'
            | 'Moissonneuse'
            | 'Reachstacker'
            | 'Terminal_Tractor'
            | 'Autre'
            | null
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          marque_id?: string | null
          code: string
          nom: string
          type_produit?:
            | 'Chariot'
            | 'Telescopique'
            | 'Nacelle'
            | 'Tracteur'
            | 'Moissonneuse'
            | 'Reachstacker'
            | 'Terminal_Tractor'
            | 'Autre'
            | null
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          marque_id?: string | null
          code?: string
          nom?: string
          type_produit?:
            | 'Chariot'
            | 'Telescopique'
            | 'Nacelle'
            | 'Tracteur'
            | 'Moissonneuse'
            | 'Reachstacker'
            | 'Terminal_Tractor'
            | 'Autre'
            | null
          actif?: boolean
          created_at?: string
        }
      }
      modeles_produits: {
        Row: {
          id: string
          marque_id: string
          categorie_id: string | null
          code_modele: string
          nom_complet: string
          puissance_cv: number | null
          caracteristiques: string | null
          type_energie: 'Electrique' | 'Diesel' | 'Essence' | 'Hybride' | 'Autre' | null
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          marque_id: string
          categorie_id?: string | null
          code_modele: string
          nom_complet: string
          puissance_cv?: number | null
          caracteristiques?: string | null
          type_energie?: 'Electrique' | 'Diesel' | 'Essence' | 'Hybride' | 'Autre' | null
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          marque_id?: string
          categorie_id?: string | null
          code_modele?: string
          nom_complet?: string
          puissance_cv?: number | null
          caracteristiques?: string | null
          type_energie?: 'Electrique' | 'Diesel' | 'Essence' | 'Hybride' | 'Autre' | null
          actif?: boolean
          created_at?: string
        }
      }
      pdm_entries: {
        Row: {
          id: string
          filiale_id: string | null
          marque: string | null
          categorie: string | null
          industrie: number | null
          src: number | null
          source_industrie_type: 'AEM TABLE' | 'WITS Shipment' | 'WITS Order' | null
          annee: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          marque?: string | null
          categorie?: string | null
          industrie?: number | null
          src?: number | null
          source_industrie_type?: 'AEM TABLE' | 'WITS Shipment' | 'WITS Order' | null
          annee: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          marque?: string | null
          categorie?: string | null
          industrie?: number | null
          src?: number | null
          source_industrie_type?: 'AEM TABLE' | 'WITS Shipment' | 'WITS Order' | null
          annee?: number
          created_by?: string | null
          created_at?: string
        }
      }
      plan_actions: {
        Row: {
          id: string
          filiale_id: string | null
          date_action: string
          action: string
          niveau_priorite: 'Haute' | 'Moyenne' | 'Basse'
          responsable_id: string | null
          responsable_nom: string | null
          date_fin_prevue: string | null
          statut: 'En_cours' | 'Retard' | 'Termine' | 'Annule'
          commentaires: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          date_action: string
          action: string
          niveau_priorite?: 'Haute' | 'Moyenne' | 'Basse'
          responsable_id?: string | null
          responsable_nom?: string | null
          date_fin_prevue?: string | null
          statut?: 'En_cours' | 'Retard' | 'Termine' | 'Annule'
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          date_action?: string
          action?: string
          niveau_priorite?: 'Haute' | 'Moyenne' | 'Basse'
          responsable_id?: string | null
          responsable_nom?: string | null
          date_fin_prevue?: string | null
          statut?: 'En_cours' | 'Retard' | 'Termine' | 'Annule'
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      historique_ventes_modeles: {
        Row: {
          id: string
          filiale_id: string | null
          marque_id: string
          categorie_id: string | null
          modele_id: string | null
          code_modele: string
          annee: number
          quantite_vendue: number | null
          created_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          marque_id: string
          categorie_id?: string | null
          modele_id?: string | null
          code_modele: string
          annee: number
          quantite_vendue?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          marque_id?: string
          categorie_id?: string | null
          modele_id?: string | null
          code_modele?: string
          annee?: number
          quantite_vendue?: number | null
          created_at?: string
        }
      }
      previsions_ventes_modeles: {
        Row: {
          id: string
          filiale_id: string | null
          marque_id: string
          categorie_id: string | null
          modele_id: string | null
          code_modele: string
          annee: number
          mois: number
          quantite_prevue: number | null
          type_prevision: 'Budget' | 'Forecast' | 'Commandes'
          modifie_par_id: string | null
          date_modification: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          marque_id: string
          categorie_id?: string | null
          modele_id?: string | null
          code_modele: string
          annee: number
          mois: number
          quantite_prevue?: number | null
          type_prevision?: 'Budget' | 'Forecast' | 'Commandes'
          modifie_par_id?: string | null
          date_modification?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          marque_id?: string
          categorie_id?: string | null
          modele_id?: string | null
          code_modele?: string
          annee?: number
          mois?: number
          quantite_prevue?: number | null
          type_prevision?: 'Budget' | 'Forecast' | 'Commandes'
          modifie_par_id?: string | null
          date_modification?: string | null
          created_at?: string
          updated_at?: string
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
          gamme: string | null
          pays: string | null
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
          gamme?: string | null
          pays?: string | null
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
          gamme?: string | null
          pays?: string | null
          statut?: 'Disponible' | 'Reserve' | 'Vendu' | 'Transfert' | 'Obsolete'
          created_at?: string
          updated_at?: string
        }
      }
      commandes_fournisseurs: {
        Row: {
          id: string
          numero: string
          fournisseur: string
          filiale_id: string
          date_commande: string
          date_livraison_prevue: string | null
          statut: 'En_cours' | 'Livree' | 'Partiellement_livree' | 'Annulee'
          montant_total: number
          devise: string
          commentaires: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          numero: string
          fournisseur: string
          filiale_id: string
          date_commande?: string
          date_livraison_prevue?: string | null
          statut?: 'En_cours' | 'Livree' | 'Partiellement_livree' | 'Annulee'
          montant_total?: number
          devise?: string
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          numero?: string
          fournisseur?: string
          filiale_id?: string
          date_commande?: string
          date_livraison_prevue?: string | null
          statut?: 'En_cours' | 'Livree' | 'Partiellement_livree' | 'Annulee'
          montant_total?: number
          devise?: string
          commentaires?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      lignes_commandes: {
        Row: {
          id: string
          commande_id: string
          article_id: string
          quantite: number
          prix_unitaire_ht: number
          quantite_recue: number
          created_at: string
        }
        Insert: {
          id?: string
          commande_id: string
          article_id: string
          quantite: number
          prix_unitaire_ht: number
          quantite_recue?: number
          created_at?: string
        }
        Update: {
          id?: string
          commande_id?: string
          article_id?: string
          quantite?: number
          prix_unitaire_ht?: number
          quantite_recue?: number
          created_at?: string
        }
      }
      entrees_stock: {
        Row: {
          id: string
          commande_id: string | null
          ligne_commande_id: string | null
          article_id: string
          filiale_id: string
          numero_serie: string | null
          quantite: number
          prix_achat_ht: number
          coefficient_prix_revient: number
          prix_revient: number | null
          date_entree: string
          valide: boolean
          valide_par_id: string | null
          date_validation: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          commande_id?: string | null
          ligne_commande_id?: string | null
          article_id: string
          filiale_id: string
          numero_serie?: string | null
          quantite: number
          prix_achat_ht: number
          coefficient_prix_revient: number
          prix_revient?: number | null
          date_entree?: string
          valide?: boolean
          valide_par_id?: string | null
          date_validation?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          commande_id?: string | null
          ligne_commande_id?: string | null
          article_id?: string
          filiale_id?: string
          numero_serie?: string | null
          quantite?: number
          prix_achat_ht?: number
          coefficient_prix_revient?: number
          prix_revient?: number | null
          date_entree?: string
          valide?: boolean
          valide_par_id?: string | null
          date_validation?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      sessions_interfiliales: {
        Row: {
          id: string
          numero: string
          filiale_origine_id: string
          filiale_destination_id: string
          article_id: string
          stock_item_id: string | null
          numero_serie: string | null
          quantite: number
          prix_transfert: number | null
          statut: 'En_attente' | 'Validee' | 'Refusee' | 'Recue'
          demande_par_id: string
          date_demande: string
          valide_origine_par_id: string | null
          date_validation_origine: string | null
          valide_destination_par_id: string | null
          date_validation_destination: string | null
          commentaires: string | null
          created_at: string
        }
        Insert: {
          id?: string
          numero: string
          filiale_origine_id: string
          filiale_destination_id: string
          article_id: string
          stock_item_id?: string | null
          numero_serie?: string | null
          quantite: number
          prix_transfert?: number | null
          statut?: 'En_attente' | 'Validee' | 'Refusee' | 'Recue'
          demande_par_id: string
          date_demande?: string
          valide_origine_par_id?: string | null
          date_validation_origine?: string | null
          valide_destination_par_id?: string | null
          date_validation_destination?: string | null
          commentaires?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          numero?: string
          filiale_origine_id?: string
          filiale_destination_id?: string
          article_id?: string
          stock_item_id?: string | null
          numero_serie?: string | null
          quantite?: number
          prix_transfert?: number | null
          statut?: 'En_attente' | 'Validee' | 'Refusee' | 'Recue'
          demande_par_id?: string
          date_demande?: string
          valide_origine_par_id?: string | null
          date_validation_origine?: string | null
          valide_destination_par_id?: string | null
          date_validation_destination?: string | null
          commentaires?: string | null
          created_at?: string
        }
      }
      commandes_clients: {
        Row: {
          id: string
          filiale_id: string | null
          numero_commande: string
          date_commande: string
          client_nom: string
          marque_id: string | null
          modele: string | null
          numero_serie: string | null
          gamme: string | null
          pays: string | null
          vendeur_id: string | null
          ca_ht_prevu: number | null
          devise: string
          prevision_facturation: string | null
          statut: 'En_cours' | 'Facture' | 'Annule' | 'Livre'
          commentaires: string | null
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          numero_commande: string
          date_commande?: string
          client_nom: string
          marque_id?: string | null
          modele?: string | null
          numero_serie?: string | null
          gamme?: string | null
          pays?: string | null
          vendeur_id?: string | null
          ca_ht_prevu?: number | null
          devise?: string
          prevision_facturation?: string | null
          statut?: 'En_cours' | 'Facture' | 'Annule' | 'Livre'
          commentaires?: string | null
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          numero_commande?: string
          date_commande?: string
          client_nom?: string
          marque_id?: string | null
          modele?: string | null
          numero_serie?: string | null
          gamme?: string | null
          pays?: string | null
          vendeur_id?: string | null
          ca_ht_prevu?: number | null
          devise?: string
          prevision_facturation?: string | null
          statut?: 'En_cours' | 'Facture' | 'Annule' | 'Livre'
          commentaires?: string | null
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      visites_clients: {
        Row: {
          id: string
          filiale_id: string | null
          date_visite: string
          nom_client: string
          prenom_client: string | null
          fonction_client: string | null
          telephone_client: string | null
          whatsapp_client: string | null
          email_client: string | null
          url_societe_client: string | null
          notes: string | null
          visite_par_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          date_visite?: string
          nom_client: string
          prenom_client?: string | null
          fonction_client?: string | null
          telephone_client?: string | null
          whatsapp_client?: string | null
          email_client?: string | null
          url_societe_client?: string | null
          notes?: string | null
          visite_par_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          date_visite?: string
          nom_client?: string
          prenom_client?: string | null
          fonction_client?: string | null
          telephone_client?: string | null
          whatsapp_client?: string | null
          email_client?: string | null
          url_societe_client?: string | null
          notes?: string | null
          visite_par_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      opportunites: {
        Row: {
          id: string
          filiale_id: string | null
          visite_id: string | null
          nom_projet: string
          ville: string | null
          marques: string[] | null
          modeles: string[] | null
          quantites: number | null
          ca_ht_potentiel: number | null
          devise: string | null
          pourcentage_marge: number | null
          date_closing_prevue: string | null
          statut: 'Gagne' | 'En_cours' | 'Reporte' | 'Abandonne' | 'Perdu'
          taux_cloture_percent: number | null
          notes: string | null
          created_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filiale_id?: string | null
          visite_id?: string | null
          nom_projet: string
          ville?: string | null
          marques?: string[] | null
          modeles?: string[] | null
          quantites?: number | null
          ca_ht_potentiel?: number | null
          devise?: string | null
          pourcentage_marge?: number | null
          date_closing_prevue?: string | null
          statut?: 'Gagne' | 'En_cours' | 'Reporte' | 'Abandonne' | 'Perdu'
          taux_cloture_percent?: number | null
          notes?: string | null
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filiale_id?: string | null
          visite_id?: string | null
          nom_projet?: string
          ville?: string | null
          marques?: string[] | null
          modeles?: string[] | null
          quantites?: number | null
          ca_ht_potentiel?: number | null
          devise?: string | null
          pourcentage_marge?: number | null
          date_closing_prevue?: string | null
          statut?: 'Gagne' | 'En_cours' | 'Reporte' | 'Abandonne' | 'Perdu'
          taux_cloture_percent?: number | null
          notes?: string | null
          created_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      powerbi_configs: {
        Row: {
          id: string
          embed_url: string | null
          dataset_id: string | null
          workspace_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          embed_url?: string | null
          dataset_id?: string | null
          workspace_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          embed_url?: string | null
          dataset_id?: string | null
          workspace_id?: string | null
          created_at?: string | null
          updated_at?: string | null
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
          gamme: string | null
          src: string | null
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
          gamme?: string | null
          src?: string | null
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
          gamme?: string | null
          src?: string | null
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
          a_participe: boolean | null
          marque_concurrent: string | null
          modele_concurrent: string | null
          prix_concurrent: number | null
          commentaires_analyse: string | null
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
          a_participe?: boolean | null
          marque_concurrent?: string | null
          modele_concurrent?: string | null
          prix_concurrent?: number | null
          commentaires_analyse?: string | null
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
          a_participe?: boolean | null
          marque_concurrent?: string | null
          modele_concurrent?: string | null
          prix_concurrent?: number | null
          commentaires_analyse?: string | null
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
          produit: string | null
          plan_compte: string | null
          constructeur: string | null
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
          produit?: string | null
          plan_compte?: string | null
          constructeur?: string | null
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
          produit?: string | null
          plan_compte?: string | null
          constructeur?: string | null
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

export type TablesWithRelationships = {
  [K in keyof Tables]: Tables[K] & { Relationships: DatabaseRelationship[] }
}

export type Database = {
  public: {
    Tables: TablesWithRelationships
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

