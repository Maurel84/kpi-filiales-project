# Instructions pour Créer la Base de Données Supabase

## Fichier à Utiliser

**Fichier**: `supabase_complete_database.sql`

Ce fichier contient toute la structure de la base de données en un seul script SQL prêt à être exécuté dans le SQL Editor de Supabase.

## Étapes d'Installation

### 1. Accéder au SQL Editor de Supabase

1. Connectez-vous à votre projet Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet **kpi-filiales-project**
3. Dans le menu de gauche, cliquez sur **SQL Editor** (icône </>)

### 2. Exécuter le Script SQL

1. Cliquez sur le bouton **New query** en haut à droite
2. Ouvrez le fichier `supabase_complete_database.sql` sur votre ordinateur
3. Copiez TOUT le contenu du fichier (Ctrl+A puis Ctrl+C)
4. Collez le contenu dans l'éditeur SQL de Supabase (Ctrl+V)
5. Cliquez sur le bouton **Run** en bas à droite (ou appuyez sur Ctrl+Enter)

### 3. Attendre la Fin de l'Exécution

Le script prendra environ **30 à 60 secondes** à s'exécuter. Vous verrez:
- Un indicateur de chargement pendant l'exécution
- Un message de succès en vert quand c'est terminé
- Le message "Success. No rows returned" est NORMAL

### 4. Vérifier que Tout est Créé

1. Cliquez sur **Database** dans le menu de gauche
2. Cliquez sur **Tables**
3. Vous devriez voir **26 tables** créées:

#### Tables Principales (26)
- ✅ filiales
- ✅ users_profiles
- ✅ kpis_reporting
- ✅ marques
- ✅ categories_produits
- ✅ modeles_produits
- ✅ articles
- ✅ stock_items
- ✅ commandes_fournisseurs
- ✅ lignes_commandes
- ✅ entrees_stock
- ✅ sessions_interfiliales
- ✅ ventes
- ✅ ventes_perdues
- ✅ forecasts
- ✅ commandes_clients
- ✅ visites_clients
- ✅ opportunites
- ✅ pdm_entries
- ✅ plan_actions
- ✅ historique_ventes_modeles
- ✅ previsions_ventes_modeles
- ✅ parc_machines
- ✅ inspections_techniques
- ✅ budgets
- ✅ audit_log

### 5. Vérifier les Données de Référence

1. Dans **Database** > **Tables**
2. Cliquez sur la table **filiales**
3. Vous devriez voir **9 filiales** pré-créées
4. Cliquez sur la table **marques**
5. Vous devriez voir **3 marques** (Manitou, Kalmar, Massey Ferguson)
6. Cliquez sur la table **categories_produits**
7. Vous devriez voir **7 catégories** créées

## Que Contient le Script?

### Structure Complète (1000+ lignes)
- ✅ 26 tables avec toutes les colonnes et contraintes
- ✅ 43 indexes de performance sur les clés étrangères
- ✅ 4 fonctions SQL avec triggers automatiques
- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ 80+ politiques RLS optimisées pour la sécurité
- ✅ 9 filiales pré-configurées
- ✅ 3 marques (Manitou, Kalmar, Massey Ferguson)
- ✅ 7 catégories de produits

### Sécurité Row Level Security (RLS)
Toutes les politiques sont optimisées avec `(select auth.uid())` pour:
- Empêcher la réévaluation à chaque ligne
- Améliorer drastiquement les performances
- Sécuriser l'accès selon les rôles

### Rôles Utilisateurs Configurés
- **admin_siege**: Accès complet multi-filiales
- **manager_filiale**: Gestion complète de sa filiale
- **commercial**: Saisie ventes et opportunités
- **technicien**: Inspections et maintenance
- **saisie**: Saisie des KPIs

## Après l'Installation

### 1. Créer Votre Premier Utilisateur

1. Dans Supabase, allez dans **Authentication** > **Users**
2. Cliquez sur **Add user** > **Create new user**
3. Entrez un email et un mot de passe
4. Cliquez sur **Create user**
5. **Copiez l'ID de l'utilisateur** (UUID) qui s'affiche

### 2. Ajouter le Profil Utilisateur

1. Retournez dans **SQL Editor**
2. Créez une nouvelle requête
3. Exécutez ce SQL (remplacez les valeurs):

```sql
-- Récupérer une filiale pour l'utilisateur (exemple: Côte d'Ivoire)
SELECT id FROM filiales WHERE code = 'CI' LIMIT 1;

-- Insérer le profil (remplacez les UUID par les vôtres)
INSERT INTO users_profiles (
  id,
  filiale_id,
  role,
  prenom,
  nom,
  email,
  actif
) VALUES (
  'VOTRE_USER_ID_ICI',  -- ID de l'utilisateur créé dans Auth
  'ID_FILIALE_ICI',      -- ID de la filiale récupéré ci-dessus
  'admin_siege',         -- Rôle (admin_siege, manager_filiale, commercial, etc.)
  'Admin',               -- Prénom
  'Système',             -- Nom
  'admin@example.com',   -- Email (même que dans Auth)
  true                   -- Actif
);
```

### 3. Tester la Connexion

1. Ouvrez votre application React (déjà configurée avec les bonnes URLs)
2. Le fichier `.env` a déjà été mis à jour avec:
   ```
   VITE_SUPABASE_URL=https://hyebjvuxbvdovognjhdt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Lancez l'application: `npm run dev`
4. Connectez-vous avec l'email/mot de passe créés

## Dépannage

### Le script ne s'exécute pas
- Vérifiez que vous avez copié TOUT le contenu du fichier
- Assurez-vous d'être dans le bon projet Supabase
- Essayez de rafraîchir la page et réessayez

### "Success. No rows returned"
- C'est NORMAL! Cela signifie que le script s'est exécuté avec succès
- Vérifiez dans Database > Tables que les tables sont créées

### Erreur "relation already exists"
- Les tables existent déjà
- Vous pouvez soit:
  1. Ignorer l'erreur (les tables sont déjà là)
  2. Supprimer les tables existantes d'abord (ATTENTION: perte de données!)

### Les tables sont créées mais vides
- C'est normal, sauf pour:
  - `filiales`: doit avoir 9 lignes
  - `marques`: doit avoir 3 lignes
  - `categories_produits`: doit avoir 7 lignes
- Si ces tables sont vides, réexécutez uniquement la section des données de référence (ligne 1700+)

### Impossible de se connecter
- Vérifiez que l'utilisateur est créé dans Authentication > Users
- Vérifiez que le profil existe dans la table users_profiles
- Vérifiez que l'ID utilisateur dans users_profiles correspond à celui dans Auth
- Vérifiez que le fichier .env est correct

## Configuration de Vercel (Déploiement)

Une fois la base de données créée et testée:

1. Poussez votre code sur GitHub
2. Connectez le repo à Vercel
3. Ajoutez les variables d'environnement dans Vercel:
   - `VITE_SUPABASE_URL`: https://hyebjvuxbvdovognjhdt.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: eyJhbGci... (la clé complète)
4. Déployez

Pour plus de détails, consultez `DEPLOYMENT.md`.

## Configuration de Power BI

Une fois la base données créée:

1. Ouvrez Power BI Desktop
2. **Obtenir les données** > **PostgreSQL**
3. Serveur: `db.hyebjvuxbvdovognjhdt.supabase.co`
4. Base de données: `postgres`
5. Utilisez vos identifiants Supabase (Database Settings)

Pour plus de détails, consultez `POWER_BI_GUIDE.md`.

## Ressources

- **README.md**: Documentation complète de l'application
- **DEPLOYMENT.md**: Guide de déploiement Vercel détaillé
- **POWER_BI_GUIDE.md**: Guide d'intégration Power BI complet
- **TEST_CREDENTIALS.md**: Identifiants de test
- **QUICK_START.md**: Démarrage rapide développement

## Support

Si vous rencontrez des problèmes:
1. Vérifiez les logs dans Supabase SQL Editor
2. Consultez la documentation Supabase: https://supabase.com/docs
3. Vérifiez que toutes les tables sont créées
4. Vérifiez que le RLS est activé sur toutes les tables

---

**Version du Script**: 1.0.0
**Date**: Décembre 2024
**Statut**: Prêt pour Production ✅
