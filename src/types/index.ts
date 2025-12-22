export interface Opportunity {
    id: string; // Unique identifier
    date_creation: string; // Date
    commercial: string; // Commercial en charge
    client: string; // Client
    nom_projet: string; // Nom du projet
    marque: string; // Marques
    modele: string; // Modèle
    quantite: number; // Qté
    ca_potentiel: number; // CA Potentiel
    marge_previsionnelle_pourcent: number; // Marge prévisionnelle %
    date_closing: string; // Date de closing prévue
    statut: 'GAGNE' | 'PERDU' | 'EN COURS'; // WIN ou LOST (Assuming mapped from Excel)

    // Concurrence info
    marque_concurrence?: string;
    modele_concurrence?: string;
    prix_concurrence?: number;

    commentaires?: string;
}

export interface Visit {
    id: string;
    date: string;
    client_nom: string;
    client_prenom: string;
    client_fonction: string;
    client_telephone: string;
    client_email: string;
    compte_rendu?: string; // Implicit from context or separate field if exists

    // Link to opportunities
    opportunite_liee?: string; // "OPPORTUNITES" column
    lost_sales_liee?: string; // "LOST SALES" column
}

export interface KPI {
    entity: string; // Pays or Vendeur name
    ytd_vs_budget: number; // YTD vs B2025
    // ... other dynamic columns for monthly values
}

export interface ReferenceItem {
    marque: string;
    modele: string;
    gamme: string;
    pays: string;
    vendeur: string;
    statut: string;
    niveau_priorite: string;
}
