# Guide Power BI - ERP Massey Ferguson

Guide détaillé pour créer des rapports Power BI connectés à Supabase.

## Table des Matières

1. [Configuration de la Connexion](#1-configuration-de-la-connexion)
2. [Modèle de Données](#2-modèle-de-données)
3. [Mesures DAX](#3-mesures-dax)
4. [Rapports Standards](#4-rapports-standards)
5. [Optimisations](#5-optimisations)

## 1. Configuration de la Connexion

### 1.1 Informations de Connexion Supabase

Récupérez ces informations depuis votre dashboard Supabase (Settings > Database):

```
Host: db.xxxxxx.supabase.co
Database: postgres
Port: 5432
User: postgres
Password: [votre_mot_de_passe]
```

### 1.2 Connexion dans Power BI Desktop

1. **Obtenir les données**
   - Cliquer sur "Obtenir les données"
   - Rechercher "PostgreSQL database"
   - Sélectionner "PostgreSQL database"

2. **Configuration**
   ```
   Serveur: db.xxxxxx.supabase.co
   Base de données: postgres

   Options de connexion de données: DirectQuery ou Import
   ```

3. **Authentification**
   - Sélectionner "Base de données"
   - Nom d'utilisateur: `postgres`
   - Mot de passe: [votre mot de passe]

### 1.3 Requêtes SQL Optimisées

Pour de meilleures performances, utilisez des requêtes SQL personnalisées:

```sql
-- Vue consolidée des ventes
SELECT
    v.id,
    v.date_vente,
    v.montant_vente,
    v.marge,
    v.type_vente,
    f.nom as filiale,
    f.pays,
    a.reference as article_ref,
    a.designation as article_nom,
    m.nom as marque,
    up.nom as commercial_nom
FROM ventes v
LEFT JOIN filiales f ON v.filiale_id = f.id
LEFT JOIN articles a ON v.article_id = a.id
LEFT JOIN marques m ON a.marque_id = m.id
LEFT JOIN users_profiles up ON v.commercial_id = up.id
WHERE v.date_vente >= CURRENT_DATE - INTERVAL '2 years';
```

## 2. Modèle de Données

### 2.1 Tables Principales

#### Tables de Faits (Fact Tables)
- `ventes` - Transactions de ventes
- `ventes_perdues` - Opportunités perdues
- `commandes_clients` - Commandes clients
- `commandes_fournisseurs` - Commandes fournisseurs
- `kpis_reporting` - KPIs mensuels
- `forecasts` - Prévisions de ventes

#### Tables de Dimensions (Dimension Tables)
- `filiales` - Filiales/Branches
- `articles` - Articles/Produits
- `marques` - Marques
- `categories_produits` - Catégories
- `modeles_produits` - Modèles
- `users_profiles` - Utilisateurs/Commerciaux

### 2.2 Relations du Modèle

```
Ventes (Fact)
├── filiales (1:N)
├── articles (1:N)
│   ├── marques (1:N)
│   └── categories_produits (1:N)
├── users_profiles (1:N) [commercial]
└── stock_items (1:1)

Stock Items (Fact)
├── filiales (1:N)
└── articles (1:N)

Commandes Clients (Fact)
├── filiales (1:N)
├── marques (1:N)
└── users_profiles (1:N) [créateur]

KPIs Reporting (Fact)
├── filiales (1:N)
└── users_profiles (1:N) [responsable]
```

### 2.3 Configuration des Relations

Dans Power BI:
1. Aller dans "Vue Modèle"
2. Créer les relations suivantes:

```
ventes[filiale_id] → filiales[id] (N:1)
ventes[article_id] → articles[id] (N:1)
ventes[commercial_id] → users_profiles[id] (N:1)
articles[marque_id] → marques[id] (N:1)
articles[categorie_id] → categories_produits[id] (N:1)
```

### 2.4 Table Calendrier (Recommandé)

Créer une table calendrier pour les analyses temporelles:

```dax
Calendrier =
ADDCOLUMNS(
    CALENDAR(DATE(2020,1,1), DATE(2030,12,31)),
    "Année", YEAR([Date]),
    "Trimestre", "T" & FORMAT([Date], "Q"),
    "Mois", MONTH([Date]),
    "Nom Mois", FORMAT([Date], "MMMM"),
    "Jour", DAY([Date]),
    "Nom Jour", FORMAT([Date], "DDDD"),
    "Semaine", WEEKNUM([Date]),
    "Année-Mois", FORMAT([Date], "YYYY-MM")
)
```

Relation: `Calendrier[Date]` → `ventes[date_vente]` (1:N)

## 3. Mesures DAX

### 3.1 Mesures de Ventes

```dax
// Chiffre d'Affaires
CA Total = SUM(ventes[montant_vente])

// CA Année Précédente
CA N-1 =
CALCULATE(
    [CA Total],
    DATEADD(Calendrier[Date], -1, YEAR)
)

// Évolution CA
Evolution CA = [CA Total] - [CA N-1]

// Évolution CA %
Evolution CA % =
DIVIDE([Evolution CA], [CA N-1], 0)

// CA Cumulé
CA Cumulé =
CALCULATE(
    [CA Total],
    FILTER(
        ALL(Calendrier),
        Calendrier[Date] <= MAX(Calendrier[Date])
    )
)

// CA Moyen par Vente
CA Moyen =
DIVIDE([CA Total], COUNTROWS(ventes), 0)
```

### 3.2 Mesures de Marge

```dax
// Marge Totale
Marge Totale = SUM(ventes[marge])

// Taux de Marge
Taux Marge =
DIVIDE([Marge Totale], [CA Total], 0)

// Marge Moyenne
Marge Moyenne = AVERAGE(ventes[marge])

// Marge par Type
Marge Neuf =
CALCULATE(
    [Marge Totale],
    ventes[type_vente] = "Neuf"
)

Marge Occasion =
CALCULATE(
    [Marge Totale],
    ventes[type_vente] = "Occasion"
)
```

### 3.3 Mesures de Volume

```dax
// Nombre de Ventes
Nb Ventes = COUNTROWS(ventes)

// Nombre de Ventes N-1
Nb Ventes N-1 =
CALCULATE(
    [Nb Ventes],
    DATEADD(Calendrier[Date], -1, YEAR)
)

// Nombre d'Articles Différents Vendus
Nb Articles Vendus = DISTINCTCOUNT(ventes[article_id])

// Nombre de Clients
Nb Clients = DISTINCTCOUNT(ventes[client_nom])
```

### 3.4 Mesures de Stock

```dax
// Valeur Stock
Valeur Stock =
SUMX(
    stock_items,
    stock_items[quantite] * stock_items[prix_achat]
)

// Nombre d'Articles en Stock
Nb Articles Stock =
SUMX(
    stock_items,
    stock_items[quantite]
)

// Articles en Rupture
Articles Rupture =
CALCULATE(
    COUNTROWS(stock_items),
    stock_items[quantite] = 0
)

// Taux de Disponibilité
Taux Disponibilite =
DIVIDE(
    CALCULATE(COUNTROWS(stock_items), stock_items[quantite] > 0),
    COUNTROWS(stock_items),
    0
)
```

### 3.5 Mesures de Performance Commerciale

```dax
// Nombre d'Opportunités
Nb Opportunites = COUNTROWS(opportunites)

// Opportunités Gagnées
Nb Opp Gagnees =
CALCULATE(
    [Nb Opportunites],
    opportunites[statut] = "Gagnée"
)

// Taux de Conversion
Taux Conversion =
DIVIDE([Nb Opp Gagnees], [Nb Opportunites], 0)

// CA Potentiel (Opportunités en cours)
CA Potentiel =
CALCULATE(
    SUM(opportunites[montant_estime]),
    opportunites[statut] IN {"Nouvelle", "En cours", "Négociation"}
)

// Nombre de Visites
Nb Visites = COUNTROWS(visites_clients)

// Ratio Visites/Ventes
Ratio Visites Ventes =
DIVIDE([Nb Ventes], [Nb Visites], 0)
```

### 3.6 Mesures de KPIs

```dax
// Objectif Mensuel
Objectif Mensuel = SUM(kpis_reporting[objectif_ca])

// Réalisé Mensuel
Realise Mensuel = SUM(kpis_reporting[realise_ca])

// Taux d'Atteinte
Taux Atteinte =
DIVIDE([Realise Mensuel], [Objectif Mensuel], 0)

// Écart vs Objectif
Ecart Objectif = [Realise Mensuel] - [Objectif Mensuel]

// Statut KPI
Statut KPI =
SWITCH(
    TRUE(),
    [Taux Atteinte] >= 1, "✅ Atteint",
    [Taux Atteinte] >= 0.9, "⚠️ Proche",
    "❌ Non Atteint"
)
```

## 4. Rapports Standards

### 4.1 Dashboard Vue d'Ensemble

**Visuels à inclure:**
1. **Cartes (KPI Cards)**
   - CA Total (mois en cours)
   - Évolution vs N-1
   - Marge Totale
   - Taux de Marge
   - Nombre de Ventes
   - CA Moyen

2. **Graphique Ligne**
   - Évolution mensuelle du CA (12 derniers mois)
   - Avec ligne de tendance

3. **Graphique Barres**
   - Top 10 Articles par CA
   - CA par Filiale

4. **Graphique Secteurs**
   - Répartition CA par Type (Neuf/Occasion)
   - Répartition CA par Marque

5. **Tableau**
   - Performance par Commercial
   - Colonnes: Nom, Nb Ventes, CA, Marge, Taux Marge

### 4.2 Dashboard Commercial

**Visuels:**
1. **Entonnoir de Conversion**
   - Nombre d'Opportunités par Statut
   - Taux de conversion global

2. **Graphique Barres Empilées**
   - Pipeline Commercial par Commercial
   - Statuts: Nouvelle, En cours, Négociation, Gagnée, Perdue

3. **Carte avec Bulles**
   - Opportunités par Pays/Ville
   - Taille = Montant estimé

4. **Matrice**
   - Opportunités par Mois et Statut
   - Valeurs conditionnelles (couleur)

5. **Tableau Détaillé**
   - Top Opportunités en Cours
   - Colonnes: Client, Montant, Date Closing, Commercial

### 4.3 Dashboard Stock

**Visuels:**
1. **Cartes KPI**
   - Valeur Totale du Stock
   - Nombre d'Articles
   - Articles en Rupture
   - Taux de Disponibilité

2. **Graphique Barres**
   - Valeur Stock par Filiale
   - Valeur Stock par Marque

3. **Tableau**
   - Articles à Réapprovisionner
   - Colonnes: Article, Quantité, Dernière Entrée, Filiale

4. **Graphique Ligne**
   - Évolution de la Valeur du Stock (6 mois)

5. **Matrice**
   - Stock par Filiale et Catégorie
   - Valeurs: Quantité et Valeur

### 4.4 Dashboard KPIs Mensuels

**Visuels:**
1. **Graphique Jauge**
   - Taux d'Atteinte de l'Objectif (mois en cours)

2. **Graphique Barres Groupées**
   - Objectif vs Réalisé par Mois (12 mois)

3. **Graphique Cascade**
   - Écarts mensuels vs Objectif

4. **Matrice Conditionnelle**
   - KPIs par Filiale et Mois
   - Mise en forme conditionnelle sur Taux Atteinte

5. **Tableau de Bord Dynamique**
   - Filtres: Filiale, Période
   - Détail des écarts par indicateur

### 4.5 Dashboard Ventes Perdues

**Visuels:**
1. **Cartes KPI**
   - CA Perdu Total
   - Nombre de Ventes Perdues
   - Montant Moyen Perdu

2. **Graphique Barres**
   - CA Perdu par Motif
   - CA Perdu par Concurrent

3. **Graphique Secteurs**
   - Répartition des Motifs de Perte

4. **Tendance**
   - Évolution mensuelle des Ventes Perdues

5. **Tableau Analyse**
   - Ventes Perdues par Commercial
   - Avec actions correctives

## 5. Optimisations

### 5.1 Performance

**Bonnes Pratiques:**

1. **Utiliser l'Import plutôt que DirectQuery** (si possible)
   - Plus rapide pour les visualisations
   - Actualisation programmée

2. **Filtrer les Données à la Source**
```sql
-- Importer seulement les données récentes
WHERE date_vente >= CURRENT_DATE - INTERVAL '3 years'
```

3. **Créer des Vues dans Supabase**
```sql
-- Vue pour Power BI
CREATE VIEW vw_ventes_analyse AS
SELECT
    v.*,
    f.nom as filiale_nom,
    a.designation as article_nom,
    m.nom as marque_nom
FROM ventes v
LEFT JOIN filiales f ON v.filiale_id = f.id
LEFT JOIN articles a ON v.article_id = a.id
LEFT JOIN marques m ON a.marque_id = m.id;
```

4. **Utiliser des Variables** pour les filtres répétitifs
```dax
DateDebut = DATE(YEAR(TODAY()), 1, 1)
```

5. **Éviter les Calculs Complexes dans les Visuels**
   - Créer des mesures DAX plutôt que calculer dans les visuels

### 5.2 Actualisation des Données

**Power BI Desktop:**
- Actualisation manuelle: Ctrl + R

**Power BI Service:**
1. Publier le rapport
2. Configurer l'actualisation:
   - Paramètres du jeu de données
   - Actualisation planifiée
   - Configurer la fréquence (jusqu'à 8x/jour)

**Passerelle de Données:**
Pour actualisation automatique:
1. Installer la passerelle locale
2. Configurer les identifiants Supabase
3. Programmer les actualisations

### 5.3 Sécurité Row-Level Security (RLS) dans Power BI

Pour filtrer les données par utilisateur:

```dax
// Table: users_profiles
[email] = USERPRINCIPALNAME()

// Table: ventes (via filiales)
[filiale_id] IN
CALCULATETABLE(
    VALUES(users_profiles[filiale_id]),
    users_profiles[email] = USERPRINCIPALNAME()
)
```

Appliquer les rôles:
1. Modélisation > Gérer les rôles
2. Créer un rôle par filiale
3. Assigner les utilisateurs dans Power BI Service

### 5.4 Paramètres Dynamiques

Créer des paramètres pour filtres dynamiques:

```dax
// Paramètre Période
Periode =
GENERATESERIES(1, 24, 1)

// Utilisation dans les mesures
CA Periode Dynamique =
CALCULATE(
    [CA Total],
    DATESINPERIOD(
        Calendrier[Date],
        MAX(Calendrier[Date]),
        -[Periode Value],
        MONTH
    )
)
```

## 6. Templates de Rapports

Des templates Power BI prêts à l'emploi sont disponibles:

1. **Rapport Commercial Global** (.pbix)
   - Dashboard synthétique
   - Vue détaillée par filiale
   - Analyse des tendances

2. **Rapport Performance Commerciale** (.pbix)
   - Suivi des commerciaux
   - Pipeline et opportunités
   - Analyse des ventes perdues

3. **Rapport Stock et Logistique** (.pbix)
   - État du stock
   - Commandes en cours
   - Analyse des approvisionnements

4. **Rapport KPIs Direction** (.pbix)
   - Vue synthétique executive
   - Suivi des objectifs
   - Indicateurs clés

## 7. Checklist de Mise en Place

- [ ] Connexion à Supabase configurée
- [ ] Modèle de données créé avec relations
- [ ] Table Calendrier ajoutée
- [ ] Mesures DAX principales créées
- [ ] Dashboard Vue d'Ensemble créé
- [ ] Dashboard Commercial créé
- [ ] Dashboard Stock créé
- [ ] Actualisation des données testée
- [ ] RLS configuré (si nécessaire)
- [ ] Rapport publié sur Power BI Service
- [ ] Formation utilisateurs effectuée

## Support

Pour toute question sur Power BI, consulter:
- [Documentation Microsoft Power BI](https://docs.microsoft.com/power-bi/)
- [DAX Guide](https://dax.guide/)
- [Power BI Community](https://community.powerbi.com/)
