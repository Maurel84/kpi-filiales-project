# Guide de Déploiement - ERP Massey Ferguson

Ce guide explique comment déployer l'application sur Vercel et l'intégrer avec Supabase et Power BI.

## Architecture

- **Frontend**: React + TypeScript + Vite (déployé sur Vercel)
- **Backend**: Supabase (base de données PostgreSQL + authentification)
- **Reporting**: Power BI (connexion directe à Supabase)

## 1. Configuration Supabase

### 1.1 Base de Données
Votre base de données Supabase est déjà configurée avec toutes les migrations appliquées.

### 1.2 Variables d'Environnement
Les variables suivantes sont disponibles dans votre fichier `.env`:
- `VITE_SUPABASE_URL`: URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY`: Clé publique (anon key)

### 1.3 Configuration RLS
Toutes les politiques Row Level Security (RLS) sont déjà en place pour sécuriser vos données.

## 2. Déploiement sur Vercel

### 2.1 Prérequis
- Compte Vercel (gratuit): https://vercel.com/signup
- Compte GitHub/GitLab/Bitbucket (pour connecter votre repo)

### 2.2 Étapes de Déploiement

#### Option A: Déploiement via GitHub (Recommandé)

1. **Pousser le code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <VOTRE_REPO_URL>
   git push -u origin main
   ```

2. **Connecter à Vercel**
   - Aller sur https://vercel.com/new
   - Cliquer sur "Import Project"
   - Sélectionner votre repository GitHub
   - Vercel détectera automatiquement Vite

3. **Configurer les Variables d'Environnement**
   Dans les paramètres du projet Vercel:
   - `VITE_SUPABASE_URL`: Votre URL Supabase
   - `VITE_SUPABASE_ANON_KEY`: Votre clé anon Supabase

4. **Déployer**
   - Cliquer sur "Deploy"
   - Vercel construira et déploiera automatiquement

#### Option B: Déploiement Direct via CLI

1. **Installer Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Se connecter**
   ```bash
   vercel login
   ```

3. **Déployer**
   ```bash
   vercel
   ```

4. **Ajouter les Variables d'Environnement**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

5. **Redéployer avec les variables**
   ```bash
   vercel --prod
   ```

### 2.3 Configuration du Domaine

Une fois déployé, Vercel vous fournira une URL (ex: `votre-app.vercel.app`).
Vous pouvez configurer un domaine personnalisé dans les paramètres Vercel.

### 2.4 Mises à Jour Automatiques

Avec GitHub connecté, chaque push sur la branche `main` déclenchera automatiquement un nouveau déploiement.

## 3. Intégration Power BI

### 3.1 Connexion à Supabase depuis Power BI

#### Étape 1: Obtenir les Informations de Connexion

Dans votre tableau de bord Supabase:
1. Aller dans "Project Settings" > "Database"
2. Noter les informations sous "Connection string":
   - Host
   - Database name
   - Port (5432)
   - User (postgres)
   - Password

#### Étape 2: Configurer Power BI Desktop

1. **Ouvrir Power BI Desktop**
2. **Obtenir les Données** > **Base de données** > **PostgreSQL**
3. **Entrer les informations de connexion**:
   - Serveur: `db.xxxxxx.supabase.co`
   - Base de données: `postgres`
4. **Options avancées** (Important pour la performance):
   ```sql
   -- Exemple de requête SQL personnalisée
   SELECT * FROM public.ventes
   WHERE date_vente >= CURRENT_DATE - INTERVAL '12 months';
   ```

5. **Authentification**:
   - Mode: "Base de données"
   - Nom d'utilisateur: `postgres`
   - Mot de passe: Votre mot de passe DB

#### Étape 3: Sélectionner les Tables

Tables principales pour les rapports:
- `ventes` - Données de ventes
- `ventes_perdues` - Ventes perdues
- `commandes_clients` - Commandes clients
- `commandes_fournisseurs` - Commandes fournisseurs
- `stock_items` - État du stock
- `forecasts` - Prévisions
- `kpis_reporting` - KPIs mensuels
- `parc_machines` - Parc machines
- `visites_clients` - Visites clients
- `opportunites` - Opportunités commerciales
- `pdm_entries` - Parts de marché

### 3.2 Modèle de Données Power BI

#### Relations Recommandées

1. **Ventes**
   - `ventes.filiale_id` → `filiales.id`
   - `ventes.article_id` → `articles.id`
   - `ventes.commercial_id` → `users_profiles.id`

2. **Stock**
   - `stock_items.filiale_id` → `filiales.id`
   - `stock_items.article_id` → `articles.id`

3. **Commandes**
   - `commandes_clients.filiale_id` → `filiales.id`
   - `commandes_clients.marque_id` → `marques.id`

#### Mesures DAX Essentielles

```dax
// Chiffre d'Affaires Total
CA Total = SUM(ventes[montant_vente])

// Marge Totale
Marge Totale = SUM(ventes[marge])

// Taux de Marge
Taux Marge = DIVIDE([Marge Totale], [CA Total], 0)

// Nombre de Ventes
Nb Ventes = COUNTROWS(ventes)

// Valeur Stock
Valeur Stock = SUMX(stock_items, stock_items[quantite] * stock_items[prix_achat])

// Taux de Conversion
Taux Conversion =
DIVIDE(
    COUNTROWS(FILTER(opportunites, opportunites[statut] = "Gagnée")),
    COUNTROWS(opportunites),
    0
)
```

### 3.3 Rapports Recommandés

#### Dashboard Commercial
- Évolution CA mensuel
- Top 10 articles vendus
- Performance par commercial
- Taux de conversion opportunités
- Pipeline commercial

#### Dashboard Stock
- Valeur du stock par filiale
- Rotation du stock
- Articles en rupture
- Commandes en attente

#### Dashboard KPIs
- Suivi mensuel des KPIs
- Comparaison objectifs vs réalisé
- Tendances annuelles

### 3.4 Actualisation des Données

#### Power BI Desktop
- Actualisation manuelle: Bouton "Actualiser"
- Actualisation planifiée: Non disponible en Desktop

#### Power BI Service (Pro/Premium)
1. Publier le rapport sur Power BI Service
2. Configurer l'actualisation planifiée:
   - Aller dans les paramètres du jeu de données
   - Configurer "Actualisation planifiée"
   - Définir la fréquence (jusqu'à 8x/jour avec Pro)

#### Passerelle de Données
Pour l'actualisation automatique, installer la passerelle Power BI:
1. Télécharger: https://powerbi.microsoft.com/gateway/
2. Installer sur un serveur accessible 24/7
3. Configurer la connexion Supabase dans la passerelle

### 3.5 Optimisations Power BI

#### Mode Import vs DirectQuery

**Mode Import** (Recommandé pour débuter):
- Plus rapide pour les visualisations
- Données stockées dans Power BI
- Actualisation manuelle ou planifiée

**Mode DirectQuery** (Pour données temps réel):
- Requêtes en direct sur Supabase
- Toujours à jour
- Performance dépend de la base de données

#### Filtres de Requête
Pour améliorer les performances, filtrer les données à la source:

```sql
-- Exemple: Données des 2 dernières années
SELECT * FROM ventes
WHERE date_vente >= CURRENT_DATE - INTERVAL '2 years';

-- Exemple: Filiale spécifique
SELECT * FROM stock_items
WHERE filiale_id = 'UUID_FILIALE';
```

## 4. Sécurité

### 4.1 Variables d'Environnement Vercel
- Ne jamais committer le fichier `.env`
- Utiliser les variables d'environnement Vercel
- Seule la clé `ANON_KEY` doit être exposée au frontend

### 4.2 Supabase RLS
- Toutes les tables ont RLS activé
- Les utilisateurs ne voient que leurs données
- Les admins ont accès complet

### 4.3 Power BI
- Utiliser les identifiants DB en lecture seule si possible
- Ne pas partager les identifiants de connexion
- Utiliser les fonctionnalités de sécurité Power BI (RLS au niveau rapport)

## 5. Monitoring

### 5.1 Vercel
- Dashboard Vercel: Logs, analytics, performance
- Alertes en cas d'erreur de build

### 5.2 Supabase
- Dashboard Supabase: Utilisation DB, requêtes lentes
- API analytics

### 5.3 Power BI
- Métriques d'utilisation des rapports
- Performance des requêtes

## 6. Support et Maintenance

### 6.1 Logs
- **Frontend**: Console Vercel
- **Backend**: Dashboard Supabase
- **Erreurs**: Table `audit_log` dans Supabase

### 6.2 Mises à Jour
- **Code**: Push sur GitHub → déploiement auto
- **Base de données**: Migrations via Supabase
- **Rapports**: Republier depuis Power BI Desktop

## 7. Coûts Estimés

### Vercel
- Plan Hobby: Gratuit
- Plan Pro: 20$/mois (si nécessaire)

### Supabase
- Plan Free: 500MB DB, 2GB bandwidth
- Plan Pro: 25$/mois (8GB DB, 50GB bandwidth)

### Power BI
- Power BI Desktop: Gratuit
- Power BI Pro: 10$/utilisateur/mois (pour partage)
- Power BI Premium: 20$/utilisateur/mois

## 8. Checklist de Déploiement

- [ ] Code poussé sur GitHub
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Application déployée et accessible
- [ ] Utilisateurs de test créés dans Supabase
- [ ] Connexion Power BI testée
- [ ] Rapports Power BI créés
- [ ] Actualisation des données configurée
- [ ] Documentation partagée avec l'équipe
- [ ] Formation utilisateurs planifiée

## 9. Ressources Utiles

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Power BI](https://docs.microsoft.com/power-bi/)
- [Supabase + Power BI Guide](https://supabase.com/docs/guides/integrations/powerbi)

## Support

Pour toute question technique, consulter:
- README.md du projet
- QUICK_START.md pour le développement local
- TEST_CREDENTIALS.md pour les accès de test
