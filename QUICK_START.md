# Guide de Démarrage Rapide
## Application Multi-Filiales

---

## Création du Premier Utilisateur

### Option 1 : Via Console Supabase (Recommandé)

1. **Accéder à Supabase Dashboard**
   - URL : https://supabase.com/dashboard
   - Projet : iisxowebuecfwmsmfeqe

2. **Créer un utilisateur dans Authentication**
   ```
   Navigation : Authentication > Users > Add User

   Email : admin@votreentreprise.com
   Password : MotDePasseSecurise123!
   Email Confirm : ON (pour éviter la vérification email)
   ```

3. **Copier l'ID de l'utilisateur créé**
   Exemple : `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

4. **Créer le profil utilisateur**
   ```sql
   -- Navigation : SQL Editor > New Query

   INSERT INTO users_profiles (
     id,
     email,
     prenom,
     nom,
     role,
     filiale_id,
     poste,
     actif
   ) VALUES (
     'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- ID copié à l'étape 3
     'admin@votreentreprise.com',
     'Admin',
     'Système',
     'admin_siege',
     NULL,  -- Admin siège n'a pas de filiale spécifique
     'Administrateur Système',
     true
   );
   ```

5. **Vérifier la création**
   ```sql
   SELECT * FROM users_profiles WHERE email = 'admin@votreentreprise.com';
   ```

---

### Option 2 : Via Interface de l'Application (Après avoir un admin)

Une fois qu'un utilisateur admin existe, il peut créer d'autres utilisateurs via l'interface.

**Note** : Cette fonctionnalité sera ajoutée en Phase 2.

---

## Créer des Utilisateurs pour Chaque Rôle

### 1. Admin Siège
```sql
-- 1. Créer dans Supabase Auth (Dashboard)
-- 2. Exécuter :
INSERT INTO users_profiles (id, email, prenom, nom, role, poste, actif)
VALUES (
  'USER_ID_FROM_AUTH',
  'admin.siege@votreentreprise.com',
  'Pierre',
  'Dupont',
  'admin_siege',
  'Directeur Général',
  true
);
```

### 2. Manager de Filiale
```sql
-- Récupérer l'ID de la filiale
SELECT id, code, nom FROM filiales WHERE code = 'FIL-A';

-- Créer le profil
INSERT INTO users_profiles (id, email, prenom, nom, role, filiale_id, poste, actif)
VALUES (
  'USER_ID_FROM_AUTH',
  'manager.ci@votreentreprise.com',
  'Marie',
  'Kouassi',
  'manager_filiale',
  'ID_FILIALE_A',  -- Remplacer par l'ID récupéré
  'Manager Côte d''Ivoire',
  true
);
```

### 3. Commercial
```sql
INSERT INTO users_profiles (id, email, prenom, nom, role, filiale_id, poste, actif)
VALUES (
  'USER_ID_FROM_AUTH',
  'commercial.ci@votreentreprise.com',
  'Jean',
  'Diallo',
  'commercial',
  'ID_FILIALE_A',
  'Commercial Senior',
  true
);
```

### 4. Technicien
```sql
INSERT INTO users_profiles (id, email, prenom, nom, role, filiale_id, poste, actif)
VALUES (
  'USER_ID_FROM_AUTH',
  'technicien.ci@votreentreprise.com',
  'Amadou',
  'Traoré',
  'technicien',
  'ID_FILIALE_A',
  'Technicien SAV',
  true
);
```

### 5. Agent de Saisie
```sql
INSERT INTO users_profiles (id, email, prenom, nom, role, filiale_id, poste, actif)
VALUES (
  'USER_ID_FROM_AUTH',
  'saisie.ci@votreentreprise.com',
  'Fatou',
  'Sow',
  'saisie',
  'ID_FILIALE_A',
  'Agent de Saisie',
  true
);
```

---

## Créer des Données de Test

### Ajouter des Ventes
```sql
-- Récupérer un article
SELECT id, reference, libelle FROM articles LIMIT 1;

-- Récupérer une filiale
SELECT id, code FROM filiales WHERE code = 'FIL-A';

-- Créer une vente
INSERT INTO ventes (
  numero,
  filiale_id,
  article_id,
  client_nom,
  client_pays,
  quantite,
  prix_vente_ht,
  prix_revient,
  date_vente,
  mois_vente,
  annee,
  statut,
  created_by
) VALUES (
  'VTE-2025-001',
  'ID_FILIALE',
  'ID_ARTICLE',
  'Société ABC',
  'Côte d''Ivoire',
  1,
  35000.00,
  28000.00,
  CURRENT_DATE,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  EXTRACT(YEAR FROM CURRENT_DATE),
  'Facturee',
  'ID_USER_COMMERCIAL'
);
```

### Ajouter du Stock
```sql
INSERT INTO stock_items (
  article_id,
  filiale_id,
  numero_serie,
  quantite,
  emplacement,
  date_entree,
  prix_achat_ht,
  prix_revient,
  statut
) VALUES (
  'ID_ARTICLE',
  'ID_FILIALE',
  'SN-2025-00123',
  1,
  'Entrepôt A - Allée 3',
  CURRENT_DATE - INTERVAL '3 months',
  25000.00,
  31250.00,  -- 25000 * 1.25
  'Disponible'
);
```

### Ajouter des KPIs
```sql
INSERT INTO kpis_reporting (
  filiale_id,
  type_kpi,
  date_entree,
  mois_cloture,
  annee,
  ligne,
  valeur,
  unite,
  status,
  responsable_saisie_id,
  created_by
) VALUES (
  'ID_FILIALE',
  'Production',
  CURRENT_DATE,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  EXTRACT(YEAR FROM CURRENT_DATE),
  1,
  1250.5,
  'tonnes',
  'Draft',
  'ID_USER_SAISIE',
  'ID_USER_SAISIE'
);
```

---

## Tester l'Application

### 1. Connexion Admin Siège
```
Email : admin.siege@votreentreprise.com
Password : [Mot de passe défini]

Accès :
- Toutes les filiales
- Tous les modules
- Droits de modification complets
```

### 2. Connexion Manager Filiale
```
Email : manager.ci@votreentreprise.com
Password : [Mot de passe défini]

Accès :
- Filiale Côte d'Ivoire uniquement
- Validation des KPIs
- Gestion des stocks et ventes de sa filiale
```

### 3. Connexion Commercial
```
Email : commercial.ci@votreentreprise.com
Password : [Mot de passe défini]

Accès :
- Filiale Côte d'Ivoire uniquement
- Création de ventes
- Déclaration de ventes perdues
- Consultation du stock
```

---

## Vérifications Post-Installation

### 1. Base de Données
```sql
-- Vérifier les filiales
SELECT code, nom, pays FROM filiales;
-- Devrait retourner 9 filiales

-- Vérifier les articles
SELECT reference, libelle, categorie FROM articles;
-- Devrait retourner 6 articles de test

-- Vérifier les utilisateurs
SELECT email, role, prenom, nom FROM users_profiles;
-- Devrait retourner tous les utilisateurs créés
```

### 2. Authentification
- [ ] Connexion avec admin fonctionne
- [ ] Dashboard s'affiche correctement
- [ ] Menu latéral visible avec tous les modules
- [ ] Déconnexion fonctionne

### 3. Permissions RLS
```sql
-- Tester en tant que manager filiale (simulé)
-- L'ID utilisateur doit correspondre à un manager

-- Cette requête devrait retourner uniquement les ventes de SA filiale
SELECT COUNT(*) FROM ventes
WHERE filiale_id = (
  SELECT filiale_id FROM users_profiles WHERE id = 'ID_MANAGER'
);

-- En tant qu'admin siège, cette requête retourne TOUTES les ventes
SELECT COUNT(*) FROM ventes;
```

### 4. Navigation
- [ ] Dashboard → Affiche statistiques
- [ ] KPIs → Liste des KPIs avec filtres
- [ ] Stocks → Liste des articles en stock
- [ ] Ventes → Liste des ventes
- [ ] Changement de vue fluide

---

## Dépannage

### Problème : Impossible de se connecter
**Solution** :
1. Vérifier que l'email et le mot de passe sont corrects
2. Vérifier dans Supabase Dashboard > Authentication que l'utilisateur existe
3. Vérifier que Email Confirm = true
4. Essayer de réinitialiser le mot de passe

### Problème : "Aucune donnée ne s'affiche"
**Solution** :
1. Vérifier que le profil utilisateur existe dans `users_profiles`
   ```sql
   SELECT * FROM users_profiles WHERE email = 'votre_email';
   ```
2. Vérifier que RLS est bien activé
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public';
   ```
3. Vérifier les logs dans Console Navigateur (F12)

### Problème : "Permission denied" lors d'une action
**Solution** :
1. Vérifier le rôle de l'utilisateur
   ```sql
   SELECT role, filiale_id FROM users_profiles WHERE email = 'votre_email';
   ```
2. S'assurer que l'action est autorisée pour ce rôle
3. Vérifier les politiques RLS de la table concernée
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'nom_table';
   ```

### Problème : Application ne démarre pas
**Solution** :
```bash
# Vérifier les dépendances
npm install

# Vérifier les variables d'environnement
cat .env
# Devrait afficher VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# Relancer en mode développement
npm run dev

# Vérifier les erreurs dans la console
```

---

## Commandes Utiles

### Développement Local
```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
# → http://localhost:5173

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Vérifier TypeScript
npm run typecheck

# Linter
npm run lint
```

### Base de Données
```sql
-- Lister toutes les tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Compter les enregistrements par table
SELECT
  'filiales' as table_name,
  COUNT(*) as count
FROM filiales
UNION ALL
SELECT 'users_profiles', COUNT(*) FROM users_profiles
UNION ALL
SELECT 'articles', COUNT(*) FROM articles
UNION ALL
SELECT 'stock_items', COUNT(*) FROM stock_items
UNION ALL
SELECT 'ventes', COUNT(*) FROM ventes
UNION ALL
SELECT 'kpis_reporting', COUNT(*) FROM kpis_reporting;

-- Voir les dernières connexions
SELECT
  email,
  last_sign_in_at
FROM auth.users
ORDER BY last_sign_in_at DESC;
```

---

## Prochaines Étapes

1. **Créer des utilisateurs pour chaque filiale**
   - Au minimum : 1 manager par filiale
   - Idéalement : 1 commercial par filiale

2. **Importer les données réelles**
   - Articles du catalogue
   - Stock existant
   - Historique des ventes (6-12 derniers mois)

3. **Former les utilisateurs**
   - Session de formation par rôle
   - Documentation accessible
   - Support dédié les premières semaines

4. **Configurer Power BI**
   - Connexion à Supabase
   - Création des rapports
   - Publication et partage

5. **Déployer en production**
   - Choisir l'hébergement (Vercel recommandé)
   - Configurer le domaine personnalisé
   - Activer HTTPS

---

## Support

Pour toute question :
1. Consulter la documentation (README.md)
2. Consulter le plan d'implémentation (IMPLEMENTATION_PLAN.md)
3. Contacter l'administrateur système
4. Ouvrir un ticket de support

**L'application est prête à être utilisée !**
