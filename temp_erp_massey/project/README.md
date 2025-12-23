# Application Multi-Filiales - Gestion Intégrée

Application web complète pour la gestion de plusieurs filiales avec suivi des KPIs, stocks, ventes, et parc machines.

## Fonctionnalités Principales

### Modules Implémentés
- **Tableau de bord** : Vue d'ensemble avec statistiques clés
- **KPIs & Reporting** : Suivi des indicateurs de performance avec workflow de validation
- **Plan d'Actions** : Suivi des actions avec priorités, responsables et échéances (EN COURS / RETARD / TERMINÉ)
- **Plans de Marché (PDM)** : Objectifs de ventes par marque, catégorie et type de produit (Manitou, Kalmar, Massey Ferguson)
- **Prévisions (Forecasts)** : Analyse des ventes historiques (2017-2024) et prévisions 2026 par modèle
- **Visites Clients & Opportunités** : Gestion des visites commerciales et pipeline des opportunités
- **Gestion des Stocks** : Suivi des articles, détection de stock obsolète (+12 mois)
- **Commandes Fournisseurs** : Suivi des commandes avec ETA et statuts (En attente, Confirmée, En transit, Reçue)
- **Commandes Clients** : Gestion des commandes clients et prévisions de facturation
- **Ventes** : Gestion des ventes avec calcul automatique des marges
- **Authentification** : Système complet avec gestion des rôles

### Modules Prêts pour Développement
- Ventes Perdues (analyse compétitive avec marque/modèle/prix concurrent)
- Parc Machines (géolocalisation)
- Inspections Techniques
- Budgets
- Sessions Interfiliales (transferts de stock)

## Architecture Technique

### Stack Technologique
- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS pour un design moderne et responsive
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **Icônes** : Lucide React

### Structure de la Base de Données

#### Tables Principales
1. **filiales** : 9 filiales pré-configurées
2. **users_profiles** : Profils utilisateurs avec rôles
3. **kpis_reporting** : KPIs avec workflow (Draft → Submitted → Approved → Closed)
4. **plan_actions** : Actions avec priorités (Haute/Moyenne/Basse) et statuts
5. **marques** : 3 marques (Manitou, Kalmar, Massey Ferguson)
6. **categories_produits** : 40+ catégories de produits par marque
7. **modeles_produits** : Catalogue complet des modèles (à importer depuis CSV)
8. **pdm_entries** : Plans de marché par filiale/marque/catégorie
9. **historique_ventes_modeles** : Historique des ventes 2017-2024 par modèle
10. **previsions_ventes_modeles** : Prévisions mensuelles 2026 par modèle
11. **articles** : Catalogue produits
12. **stock_items** : Stock par filiale avec statut et date d'entrée
13. **ventes** : Ventes avec calcul de marges
14. **ventes_perdues** : Opportunités perdues avec analyse concurrentielle
15. **commandes_clients** : Commandes clients avec prévisions de facturation
16. **visites_clients** : Visites commerciales avec contacts détaillés
17. **opportunites** : Pipeline commercial avec statuts et taux de clôture
18. **commandes_fournisseurs** : Commandes avec ETA et suivi de livraison
19. **parc_machines** : Machines clients
20. **inspections_techniques** : Inspections réalisées
21. **budgets** : Budgets annuels
22. **forecasts** : Prévisions commerciales
23. **sessions_interfiliales** : Transferts entre filiales
24. **audit_log** : Historique des modifications

### Sécurité (RLS - Row Level Security)
Toutes les tables ont des politiques RLS restrictives :
- **Admin Siège** : Accès complet à toutes les filiales
- **Manager Filiale** : Accès et validation pour sa filiale
- **Commercial** : Accès en lecture/écriture pour sa filiale
- **Technicien** : Accès aux inspections de sa filiale
- **Saisie** : Accès en lecture/écriture limité

## Rôles Utilisateurs

### 1. Admin Siège (admin_siege)
- Accès complet à toutes les filiales
- Réouverture des périodes clôturées
- Gestion des utilisateurs et budgets
- Vue consolidée multi-filiales

### 2. Manager Filiale (manager_filiale)
- Gestion complète de sa filiale
- Validation des KPIs et transactions
- Accès aux forecasts modifiables
- Gestion des sessions interfiliales

### 3. Commercial (commercial)
- Saisie des ventes et opportunités
- Déclaration des ventes perdues
- Consultation du stock de sa filiale
- Accès à son historique de ventes

### 4. Technicien (technicien)
- Création d'inspections techniques
- Génération de devis
- Suivi du parc machines
- Recommandations de pièces

### 5. Saisie (saisie)
- Saisie des KPIs
- Consultation des données
- Accès limité en lecture seule

## Workflow de Validation des KPIs

1. **Draft** : Brouillon, modifiable par le créateur
2. **Submitted** : Soumis pour validation
3. **Approved** : Validé par le manager
4. **Closed** : Clôturé (lecture seule)
5. **Reopened_by_Mgmt** : Réouvert par le siège pour correction

## Gestion des Stocks

### Fonctionnalités
- Suivi en temps réel du stock par filiale
- Détection automatique du stock obsolète (>12 mois)
- Gestion des numéros de série
- Calcul automatique du prix de revient
- Statuts : Disponible, Réservé, Vendu, Transfert, Obsolète

### Sessions Interfiliales
Permet le transfert de stock entre filiales avec validation :
1. Demande de transfert par la filiale origine
2. Validation par le manager origine
3. Validation par le manager destination
4. Mise à jour automatique des stocks

## Gestion des Ventes

### Calculs Automatiques
- **Prix de revient** : Prix d'achat × Coefficient
- **Marge** : Prix de vente - Prix de revient
- **Taux de marge** : (Marge / Prix de revient) × 100

### Indicateurs Visuels
- Vert : Marge ≥ 20%
- Ambre : Marge entre 10% et 20%
- Rouge : Marge < 10%

## Intégration Power BI

### Données Disponibles
La structure de base de données est optimisée pour Power BI :
- Tables indexées pour performance
- Champs calculés (marge, taux de marge, âge du stock)
- Historique complet dans audit_log

### Connexion
1. Connecter Power BI à Supabase (PostgreSQL)
2. Importer les tables nécessaires
3. Créer des mesures DAX pour analyses avancées

### Exemples de Mesures DAX

```dax
Total_Ventes = SUM(ventes[prix_vente_ht])

Marge_Totale = SUM(ventes[marge])

Taux_Marge_Moyen = DIVIDE([Marge_Totale], SUM(ventes[prix_revient]), 0) * 100

Ventes_MoM =
VAR CurrentMonth = [Total_Ventes]
VAR PreviousMonth = CALCULATE([Total_Ventes], PREVIOUSMONTH('Date'[Date]))
RETURN DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth, 0) * 100

Stock_Obsolete = CALCULATE(
    COUNTROWS(stock_items),
    DATEDIFF(stock_items[date_entree], TODAY(), MONTH) > 12
)
```

## Configuration Initiale

### 1. Prérequis
- Node.js 18+ installé
- Compte Supabase configuré
- Base de données migrée (déjà fait)

### 2. Variables d'Environnement
Les variables sont déjà configurées dans `.env` :
```
VITE_SUPABASE_URL=https://iisxowebuecfwmsmfeqe.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### 3. Création du Premier Utilisateur

Pour créer un utilisateur admin, utilisez la console Supabase :

```sql
-- 1. Créer l'utilisateur dans Supabase Auth (via Dashboard)
-- 2. Ajouter son profil
INSERT INTO users_profiles (id, email, prenom, nom, role, filiale_id, actif)
VALUES (
  'ID_USER_FROM_AUTH',
  'admin@exemple.com',
  'Admin',
  'Siège',
  'admin_siege',
  NULL,
  true
);
```

### 4. Données de Test

9 filiales sont déjà créées :
- Filiale Côte d'Ivoire (XOF)
- Filiale Sénégal (XOF)
- Filiale Cameroun (XAF)
- Filiale Gabon (XAF)
- Filiale Mali (XOF)
- Filiale Burkina Faso (XOF)
- Filiale Guinée (GNF)
- Filiale Congo (XAF)
- Filiale Bénin (XOF)

Articles de test disponibles :
- Chariot élévateur 3T
- Tracteur agricole 100CV
- Pièces diverses
- Services de maintenance

## Développement

### Commandes Disponibles

```bash
# Installation des dépendances
npm install

# Développement local
npm run dev

# Build de production
npm run build

# Vérification TypeScript
npm run typecheck

# Linting
npm run lint
```

### Structure du Projet

```
src/
├── components/
│   ├── Auth/                    # Authentification
│   ├── Dashboard/               # Tableau de bord
│   ├── KPIs/                    # Gestion des KPIs
│   ├── PlanActions/             # Plan d'actions
│   ├── PDM/                     # Plans de marché
│   ├── Forecasts/               # Prévisions de ventes
│   ├── VisitesClients/          # Visites & Opportunités
│   ├── CommandesClients/        # Commandes clients
│   ├── CommandesFournisseurs/   # Commandes fournisseurs
│   ├── Stocks/                  # Gestion des stocks
│   ├── Ventes/                  # Gestion des ventes
│   └── Layout/                  # Layout principal
├── contexts/
│   └── AuthContext.tsx          # Context d'authentification
├── lib/
│   ├── database.types.ts        # Types TypeScript
│   └── supabase.ts             # Client Supabase
├── App.tsx                      # Composant principal
├── main.tsx                    # Point d'entrée
└── index.css                   # Styles globaux
```

## Prochaines Étapes

### Phase 2 - Modules Restants
1. **Ventes Perdues** : Amélioration de l'interface avec analyse compétitive détaillée
2. **Parc Machines** : Carte interactive avec géolocalisation
3. **Inspections Techniques** : Formulaires numériques avec photos et recommandations
4. **Budgets** : Saisie et suivi des budgets annuels avec comparaisons
5. **Sessions Interfiliales** : Interface de transfert de stock entre filiales avec validation

### Phase 3 - Fonctionnalités Avancées
1. **Notifications** : Alertes pour validations en attente
2. **Export PDF** : Génération automatique de rapports
3. **Workflow Email** : Notifications automatiques
4. **Mobile App** : Version PWA pour saisie terrain
5. **Analytics Avancés** : Tableaux de bord personnalisés
6. **API Rest** : Endpoints pour intégrations externes

### Phase 4 - Power Automate
1. **Alertes à la saisie** : Email aux validateurs
2. **Rappels périodiques** : Mi-mois et avant clôture
3. **Validation & Clôture** : Workflow d'approbation
4. **Export automatique** : Génération PDF mensuelle
5. **Réouverture** : Notification aux filiales

## Support & Documentation

### Ressources
- Documentation Supabase : https://supabase.com/docs
- Documentation React : https://react.dev
- Documentation Tailwind CSS : https://tailwindcss.com

### Contact
Pour toute question ou support, contacter l'administrateur système.

## Licence
Propriétaire - Tous droits réservés
