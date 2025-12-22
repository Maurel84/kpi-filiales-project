# Comptes de Test - Identifiants

## Liste des Comptes Disponibles

Tous les comptes utilisent le mot de passe : **Test123!**

### 1. Admin Siège
- **Email** : `admin@example.com`
- **Mot de passe** : `Test123!`
- **Rôle** : Administrateur Siège
- **Accès** : Toutes les filiales
- **Permissions** : Accès complet à toutes les fonctionnalités

### 2. Manager Filiale
- **Email** : `manager@example.com`
- **Mot de passe** : `Test123!`
- **Rôle** : Manager de Filiale
- **Filiale** : Cameroun - Douala
- **Permissions** :
  - Validation des KPIs
  - Gestion des utilisateurs de sa filiale
  - Accès aux rapports consolidés
  - Gestion des commandes et opportunités

### 3. Commercial
- **Email** : `commercial@example.com`
- **Mot de passe** : `Test123!`
- **Rôle** : Commercial
- **Filiale** : Cameroun - Douala
- **Permissions** :
  - Création et suivi des visites clients
  - Gestion des opportunités
  - Création des commandes clients
  - Consultation du stock
  - Saisie des ventes

### 4. Technicien
- **Email** : `technicien@example.com`
- **Mot de passe** : `Test123!`
- **Rôle** : Technicien SAV
- **Filiale** : Cameroun - Douala
- **Permissions** :
  - Consultation du parc machines
  - Saisie des inspections techniques
  - Consultation du stock de pièces

### 5. Agent de Saisie
- **Email** : `saisie@example.com`
- **Mot de passe** : `Test123!`
- **Rôle** : Agent de Saisie
- **Filiale** : Cameroun - Douala
- **Permissions** :
  - Saisie des KPIs
  - Saisie des ventes
  - Consultation du stock
  - Création des commandes fournisseurs

## Guide de Création

Pour créer ces comptes dans Supabase, suivez ces étapes :

### Étape 1 : Créer les utilisateurs dans Supabase Auth

1. Connectez-vous à votre Dashboard Supabase
2. Allez dans **Authentication** > **Users**
3. Cliquez sur **Add User** > **Create new user**
4. Pour chaque utilisateur :
   - Entrez l'email
   - Entrez le mot de passe : `Test123!`
   - **Décochez** "Auto Confirm User" pour éviter l'envoi d'email
   - Cochez "Email Confirm" directement
   - Cliquez sur **Create user**

### Étape 2 : Créer les profils

Après avoir créé les 5 utilisateurs dans Auth, exécutez ce script SQL :

```sql
-- 1. Admin Siège
INSERT INTO users_profiles (
  id,
  email,
  prenom,
  nom,
  filiale_id,
  role,
  poste,
  actif
)
SELECT
  au.id,
  'admin@example.com',
  'Admin',
  'SYSTÈME',
  NULL,  -- Admin n'est pas rattaché à une filiale
  'admin_siege',
  'Administrateur Système',
  true
FROM auth.users au
WHERE au.email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  prenom = EXCLUDED.prenom,
  nom = EXCLUDED.nom,
  role = EXCLUDED.role,
  poste = EXCLUDED.poste;

-- 2. Manager Filiale (Cameroun - Douala)
INSERT INTO users_profiles (
  id,
  email,
  prenom,
  nom,
  filiale_id,
  role,
  poste,
  actif
)
SELECT
  au.id,
  'manager@example.com',
  'Marie',
  'DUBOIS',
  (SELECT id FROM filiales WHERE nom_filiale = 'Cameroun - Douala' LIMIT 1),
  'manager_filiale',
  'Responsable Filiale',
  true
FROM auth.users au
WHERE au.email = 'manager@example.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  prenom = EXCLUDED.prenom,
  nom = EXCLUDED.nom,
  role = EXCLUDED.role,
  poste = EXCLUDED.poste;

-- 3. Commercial (Cameroun - Douala)
INSERT INTO users_profiles (
  id,
  email,
  prenom,
  nom,
  filiale_id,
  role,
  poste,
  actif
)
SELECT
  au.id,
  'commercial@example.com',
  'Jean',
  'MARTIN',
  (SELECT id FROM filiales WHERE nom_filiale = 'Cameroun - Douala' LIMIT 1),
  'commercial',
  'Ingénieur Commercial',
  true
FROM auth.users au
WHERE au.email = 'commercial@example.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  prenom = EXCLUDED.prenom,
  nom = EXCLUDED.nom,
  role = EXCLUDED.role,
  poste = EXCLUDED.poste;

-- 4. Technicien (Cameroun - Douala)
INSERT INTO users_profiles (
  id,
  email,
  prenom,
  nom,
  filiale_id,
  role,
  poste,
  actif
)
SELECT
  au.id,
  'technicien@example.com',
  'Pierre',
  'NGUYEN',
  (SELECT id FROM filiales WHERE nom_filiale = 'Cameroun - Douala' LIMIT 1),
  'technicien',
  'Technicien SAV',
  true
FROM auth.users au
WHERE au.email = 'technicien@example.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  prenom = EXCLUDED.prenom,
  nom = EXCLUDED.nom,
  role = EXCLUDED.role,
  poste = EXCLUDED.poste;

-- 5. Agent de Saisie (Cameroun - Douala)
INSERT INTO users_profiles (
  id,
  email,
  prenom,
  nom,
  filiale_id,
  role,
  poste,
  actif
)
SELECT
  au.id,
  'saisie@example.com',
  'Sophie',
  'BERNARD',
  (SELECT id FROM filiales WHERE nom_filiale = 'Cameroun - Douala' LIMIT 1),
  'saisie',
  'Assistant(e) de Gestion',
  true
FROM auth.users au
WHERE au.email = 'saisie@example.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  prenom = EXCLUDED.prenom,
  nom = EXCLUDED.nom,
  role = EXCLUDED.role,
  poste = EXCLUDED.poste;

-- Vérification
SELECT
  up.email,
  up.prenom || ' ' || up.nom as nom_complet,
  up.role,
  up.poste,
  COALESCE(f.nom_filiale, 'Siège Social') as filiale,
  up.actif
FROM users_profiles up
LEFT JOIN filiales f ON up.filiale_id = f.id
WHERE up.email LIKE '%@example.com'
ORDER BY
  CASE up.role
    WHEN 'admin_siege' THEN 1
    WHEN 'manager_filiale' THEN 2
    WHEN 'commercial' THEN 3
    WHEN 'technicien' THEN 4
    WHEN 'saisie' THEN 5
  END;
```

## Comparatif des Permissions

| Fonctionnalité | Admin | Manager | Commercial | Technicien | Saisie |
|----------------|-------|---------|------------|------------|--------|
| Tableau de bord | ✅ Tous | ✅ Sa filiale | ✅ Sa filiale | ✅ Sa filiale | ✅ Sa filiale |
| KPIs & Reporting | ✅ Tous | ✅ Validation | ✅ Lecture | ❌ | ✅ Saisie |
| Plan d'Actions | ✅ Tous | ✅ Tous | ✅ Ses actions | ✅ Ses actions | ✅ Lecture |
| Plans de Marché (PDM) | ✅ Tous | ✅ Sa filiale | ❌ | ❌ | ❌ |
| Prévisions (Forecasts) | ✅ Tous | ✅ Sa filiale | ✅ Lecture | ❌ | ❌ |
| Visites & Opportunités | ✅ Tous | ✅ Sa filiale | ✅ Création/Suivi | ❌ | ❌ |
| Gestion des Stocks | ✅ Tous | ✅ Sa filiale | ✅ Lecture | ✅ Lecture | ✅ Saisie |
| Commandes Fournisseurs | ✅ Tous | ✅ Sa filiale | ✅ Lecture | ✅ Lecture | ✅ Création |
| Commandes Clients | ✅ Tous | ✅ Sa filiale | ✅ Création/Suivi | ❌ | ✅ Lecture |
| Ventes | ✅ Tous | ✅ Sa filiale | ✅ Création | ❌ | ✅ Saisie |
| Parc Machines | ✅ Tous | ✅ Sa filiale | ✅ Lecture | ✅ Gestion | ❌ |
| Inspections Techniques | ✅ Tous | ✅ Sa filiale | ❌ | ✅ Création | ❌ |
| Budgets | ✅ Tous | ✅ Sa filiale | ❌ | ❌ | ❌ |
| Sessions Interfiliales | ✅ Tous | ✅ Validation | ❌ | ❌ | ❌ |

## Test Rapide

Pour tester rapidement tous les comptes :

1. **Test Admin** : `admin@example.com`
   - Vérifiez que vous voyez toutes les filiales dans le sélecteur
   - Accédez aux Plans de Marché et Forecasts

2. **Test Manager** : `manager@example.com`
   - Vérifiez que vous ne voyez que la filiale "Cameroun - Douala"
   - Testez la validation d'un KPI

3. **Test Commercial** : `commercial@example.com`
   - Créez une visite client
   - Créez une opportunité
   - Créez une commande client

4. **Test Technicien** : `technicien@example.com`
   - Vérifiez l'accès au Parc Machines
   - Vérifiez l'accès aux Inspections

5. **Test Saisie** : `saisie@example.com`
   - Testez la saisie d'un KPI
   - Testez la création d'une commande fournisseur

## Notes Importantes

- ⚠️ Ces comptes sont des comptes de **test uniquement**
- ⚠️ Ne pas utiliser en production
- ⚠️ Changer les mots de passe en production
- ⚠️ Les emails @example.com doivent être remplacés par de vrais emails en production

## Dépannage

### Problème : "Email already registered"
**Solution** : L'utilisateur existe déjà dans Supabase Auth. Passez directement à l'Étape 2.

### Problème : "Invalid login credentials"
**Solution** : Vérifiez que le mot de passe est bien `Test123!` (avec majuscule et point d'exclamation)

### Problème : "User has no profile"
**Solution** : Exécutez le script SQL de l'Étape 2 pour créer les profils

### Problème : Utilisateur créé mais rien ne s'affiche
**Solution** : Vérifiez que la filiale existe et que l'utilisateur y est bien rattaché :

```sql
SELECT * FROM users_profiles WHERE email = 'VOTRE_EMAIL';
SELECT * FROM filiales WHERE nom_filiale = 'Cameroun - Douala';
```
