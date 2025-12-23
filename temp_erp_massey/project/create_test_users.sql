-- =============================================================================
-- SCRIPT DE CRÉATION D'UTILISATEURS DE TEST
-- Application Multi-Filiales
-- =============================================================================

-- IMPORTANT : Ce script crée uniquement les PROFILS utilisateurs.
-- Vous devez d'abord créer les utilisateurs dans Supabase Auth (Dashboard)
-- puis remplacer les 'USER_ID_XXX' par les vrais IDs générés.

-- =============================================================================
-- ÉTAPE 1 : Récupérer les IDs des filiales
-- =============================================================================

-- Afficher toutes les filiales disponibles
SELECT id, code, nom, pays FROM filiales ORDER BY code;

-- Stocker les IDs dans des variables (à adapter selon votre base)
-- Pour PostgreSQL, vous pouvez utiliser des CTEs ou simplement copier les IDs

-- =============================================================================
-- ÉTAPE 2 : Créer les profils utilisateurs
-- =============================================================================

-- 1. ADMIN SIÈGE
-- Créez d'abord cet utilisateur dans Supabase Auth Dashboard :
--    Email: admin.siege@exemple.com
--    Password: Admin123!
--    Email Confirm: ON

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
  'USER_ID_ADMIN',  -- À REMPLACER par l'ID généré dans Auth
  'admin.siege@exemple.com',
  'Admin',
  'Système',
  'admin_siege',
  NULL,  -- Admin siège n'a pas de filiale
  'Administrateur Système',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. MANAGER FILIALE CÔTE D'IVOIRE
-- Email: manager.ci@exemple.com
-- Password: Manager123!

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
  'USER_ID_MANAGER_CI',  -- À REMPLACER
  'manager.ci@exemple.com',
  'Marie',
  'Kouassi',
  'manager_filiale',
  (SELECT id FROM filiales WHERE code = 'FIL-A'),
  'Manager Filiale Côte d''Ivoire',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. COMMERCIAL CÔTE D'IVOIRE
-- Email: commercial.ci@exemple.com
-- Password: Commercial123!

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
  'USER_ID_COMMERCIAL_CI',  -- À REMPLACER
  'commercial.ci@exemple.com',
  'Jean',
  'Diallo',
  'commercial',
  (SELECT id FROM filiales WHERE code = 'FIL-A'),
  'Commercial Senior',
  true
) ON CONFLICT (id) DO NOTHING;

-- 4. TECHNICIEN CÔTE D'IVOIRE
-- Email: technicien.ci@exemple.com
-- Password: Technicien123!

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
  'USER_ID_TECHNICIEN_CI',  -- À REMPLACER
  'technicien.ci@exemple.com',
  'Amadou',
  'Traoré',
  'technicien',
  (SELECT id FROM filiales WHERE code = 'FIL-A'),
  'Technicien SAV',
  true
) ON CONFLICT (id) DO NOTHING;

-- 5. AGENT DE SAISIE CÔTE D'IVOIRE
-- Email: saisie.ci@exemple.com
-- Password: Saisie123!

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
  'USER_ID_SAISIE_CI',  -- À REMPLACER
  'saisie.ci@exemple.com',
  'Fatou',
  'Sow',
  'saisie',
  (SELECT id FROM filiales WHERE code = 'FIL-A'),
  'Agent de Saisie',
  true
) ON CONFLICT (id) DO NOTHING;

-- 6. MANAGER FILIALE SÉNÉGAL
-- Email: manager.sn@exemple.com
-- Password: Manager123!

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
  'USER_ID_MANAGER_SN',  -- À REMPLACER
  'manager.sn@exemple.com',
  'Moussa',
  'Ndiaye',
  'manager_filiale',
  (SELECT id FROM filiales WHERE code = 'FIL-B'),
  'Manager Filiale Sénégal',
  true
) ON CONFLICT (id) DO NOTHING;

-- 7. COMMERCIAL SÉNÉGAL
-- Email: commercial.sn@exemple.com
-- Password: Commercial123!

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
  'USER_ID_COMMERCIAL_SN',  -- À REMPLACER
  'commercial.sn@exemple.com',
  'Aïssatou',
  'Fall',
  'commercial',
  (SELECT id FROM filiales WHERE code = 'FIL-B'),
  'Commercial Senior',
  true
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 3 : Créer des données de test
-- =============================================================================

-- Ventes de test (uniquement si les utilisateurs sont créés)
DO $$
DECLARE
  v_filiale_ci UUID;
  v_filiale_sn UUID;
  v_article_chariot UUID;
  v_article_tracteur UUID;
  v_commercial_ci UUID;
  v_commercial_sn UUID;
BEGIN
  -- Récupérer les IDs
  SELECT id INTO v_filiale_ci FROM filiales WHERE code = 'FIL-A';
  SELECT id INTO v_filiale_sn FROM filiales WHERE code = 'FIL-B';
  SELECT id INTO v_article_chariot FROM articles WHERE reference = 'MACH-001';
  SELECT id INTO v_article_tracteur FROM articles WHERE reference = 'MACH-002';

  -- Vérifier si les commerciaux existent (sinon skip)
  SELECT id INTO v_commercial_ci FROM users_profiles WHERE email = 'commercial.ci@exemple.com';
  SELECT id INTO v_commercial_sn FROM users_profiles WHERE email = 'commercial.sn@exemple.com';

  -- Ventes Côte d'Ivoire
  IF v_commercial_ci IS NOT NULL THEN
    INSERT INTO ventes (
      numero, filiale_id, article_id, client_nom, client_pays,
      quantite, prix_vente_ht, prix_revient,
      date_vente, mois_vente, annee, commercial_id, statut, created_by
    ) VALUES
      ('VTE-CI-001', v_filiale_ci, v_article_chariot, 'Entreprise ABC CI', 'Côte d''Ivoire',
       1, 35000.00, 31250.00, CURRENT_DATE - INTERVAL '10 days',
       TO_CHAR(CURRENT_DATE - INTERVAL '10 days', 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), v_commercial_ci, 'Facturee', v_commercial_ci),

      ('VTE-CI-002', v_filiale_ci, v_article_tracteur, 'Société XYZ CI', 'Côte d''Ivoire',
       1, 58500.00, 58500.00, CURRENT_DATE - INTERVAL '5 days',
       TO_CHAR(CURRENT_DATE - INTERVAL '5 days', 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), v_commercial_ci, 'Facturee', v_commercial_ci),

      ('VTE-CI-003', v_filiale_ci, v_article_chariot, 'Logistique Pro CI', 'Côte d''Ivoire',
       2, 33000.00, 31250.00, CURRENT_DATE - INTERVAL '2 days',
       TO_CHAR(CURRENT_DATE - INTERVAL '2 days', 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), v_commercial_ci, 'Commande', v_commercial_ci)
    ON CONFLICT (numero) DO NOTHING;
  END IF;

  -- Ventes Sénégal
  IF v_commercial_sn IS NOT NULL THEN
    INSERT INTO ventes (
      numero, filiale_id, article_id, client_nom, client_pays,
      quantite, prix_vente_ht, prix_revient,
      date_vente, mois_vente, annee, commercial_id, statut, created_by
    ) VALUES
      ('VTE-SN-001', v_filiale_sn, v_article_tracteur, 'Agriculture SN', 'Sénégal',
       1, 60000.00, 58500.00, CURRENT_DATE - INTERVAL '15 days',
       TO_CHAR(CURRENT_DATE - INTERVAL '15 days', 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), v_commercial_sn, 'Facturee', v_commercial_sn),

      ('VTE-SN-002', v_filiale_sn, v_article_chariot, 'Port de Dakar', 'Sénégal',
       3, 34000.00, 31250.00, CURRENT_DATE - INTERVAL '7 days',
       TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), v_commercial_sn, 'Facturee', v_commercial_sn)
    ON CONFLICT (numero) DO NOTHING;
  END IF;

  RAISE NOTICE 'Ventes de test créées avec succès';
END $$;

-- Stock de test
DO $$
DECLARE
  v_filiale_ci UUID;
  v_filiale_sn UUID;
  v_article_chariot UUID;
  v_article_tracteur UUID;
  v_article_piece1 UUID;
  v_article_piece2 UUID;
BEGIN
  SELECT id INTO v_filiale_ci FROM filiales WHERE code = 'FIL-A';
  SELECT id INTO v_filiale_sn FROM filiales WHERE code = 'FIL-B';
  SELECT id INTO v_article_chariot FROM articles WHERE reference = 'MACH-001';
  SELECT id INTO v_article_tracteur FROM articles WHERE reference = 'MACH-002';
  SELECT id INTO v_article_piece1 FROM articles WHERE reference = 'PIECE-001';
  SELECT id INTO v_article_piece2 FROM articles WHERE reference = 'PIECE-002';

  -- Stock Côte d'Ivoire
  INSERT INTO stock_items (
    article_id, filiale_id, numero_serie, quantite, emplacement,
    date_entree, prix_achat_ht, prix_revient, statut
  ) VALUES
    (v_article_chariot, v_filiale_ci, 'SN-CI-2025-001', 1, 'Entrepôt A - Zone 1',
     CURRENT_DATE - INTERVAL '2 months', 25000.00, 31250.00, 'Disponible'),

    (v_article_chariot, v_filiale_ci, 'SN-CI-2025-002', 1, 'Entrepôt A - Zone 1',
     CURRENT_DATE - INTERVAL '15 months', 24000.00, 30000.00, 'Disponible'),  -- Obsolète

    (v_article_tracteur, v_filiale_ci, 'SN-CI-2025-010', 1, 'Entrepôt B',
     CURRENT_DATE - INTERVAL '1 month', 45000.00, 58500.00, 'Reserve'),

    (v_article_piece1, v_filiale_ci, NULL, 50, 'Rayonnage C-12',
     CURRENT_DATE - INTERVAL '3 months', 15.00, 22.50, 'Disponible'),

    (v_article_piece2, v_filiale_ci, NULL, 20, 'Rayonnage C-15',
     CURRENT_DATE - INTERVAL '1 month', 120.00, 168.00, 'Disponible')
  ON CONFLICT DO NOTHING;

  -- Stock Sénégal
  INSERT INTO stock_items (
    article_id, filiale_id, numero_serie, quantite, emplacement,
    date_entree, prix_achat_ht, prix_revient, statut
  ) VALUES
    (v_article_chariot, v_filiale_sn, 'SN-SN-2025-001', 1, 'Entrepôt Principal',
     CURRENT_DATE - INTERVAL '1 month', 25000.00, 31250.00, 'Disponible'),

    (v_article_tracteur, v_filiale_sn, 'SN-SN-2025-005', 1, 'Entrepôt Principal',
     CURRENT_DATE - INTERVAL '14 months', 43000.00, 55900.00, 'Disponible'),  -- Obsolète

    (v_article_piece1, v_filiale_sn, NULL, 80, 'Rayonnage A-5',
     CURRENT_DATE - INTERVAL '2 months', 15.00, 22.50, 'Disponible')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Stock de test créé avec succès';
END $$;

-- KPIs de test
DO $$
DECLARE
  v_filiale_ci UUID;
  v_filiale_sn UUID;
  v_user_saisie_ci UUID;
  v_user_manager_ci UUID;
BEGIN
  SELECT id INTO v_filiale_ci FROM filiales WHERE code = 'FIL-A';
  SELECT id INTO v_filiale_sn FROM filiales WHERE code = 'FIL-B';
  SELECT id INTO v_user_saisie_ci FROM users_profiles WHERE email = 'saisie.ci@exemple.com';
  SELECT id INTO v_user_manager_ci FROM users_profiles WHERE email = 'manager.ci@exemple.com';

  IF v_user_saisie_ci IS NOT NULL THEN
    INSERT INTO kpis_reporting (
      filiale_id, type_kpi, date_entree, mois_cloture, annee,
      ligne, valeur, unite, status, responsable_saisie_id, created_by
    ) VALUES
      (v_filiale_ci, 'Production', CURRENT_DATE, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), 1, 1250.50, 'tonnes', 'Draft', v_user_saisie_ci, v_user_saisie_ci),

      (v_filiale_ci, 'Rendement', CURRENT_DATE, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), 1, 85.3, '%', 'Submitted', v_user_saisie_ci, v_user_saisie_ci),

      (v_filiale_ci, 'Heures', CURRENT_DATE, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), 1, 2340, 'heures', 'Approved', v_user_saisie_ci, v_user_saisie_ci),

      (v_filiale_ci, 'Couts', CURRENT_DATE - INTERVAL '1 month',
       TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
       EXTRACT(YEAR FROM CURRENT_DATE), 1, 45600, 'XOF', 'Closed', v_user_saisie_ci, v_user_saisie_ci)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'KPIs de test créés avec succès';
  END IF;
END $$;

-- =============================================================================
-- ÉTAPE 4 : Vérification
-- =============================================================================

-- Afficher tous les profils créés
SELECT
  email,
  prenom,
  nom,
  role,
  COALESCE(f.nom, 'Siège') as filiale,
  poste,
  actif
FROM users_profiles up
LEFT JOIN filiales f ON f.id = up.filiale_id
ORDER BY role, email;

-- Résumé par filiale
SELECT
  f.code,
  f.nom as filiale,
  COUNT(DISTINCT v.id) as nb_ventes,
  COALESCE(SUM(v.prix_vente_ht), 0) as ca_total,
  COUNT(DISTINCT s.id) as nb_stock,
  COUNT(DISTINCT k.id) as nb_kpis
FROM filiales f
LEFT JOIN ventes v ON v.filiale_id = f.id
LEFT JOIN stock_items s ON s.filiale_id = f.id
LEFT JOIN kpis_reporting k ON k.filiale_id = f.id
GROUP BY f.code, f.nom
ORDER BY f.code;

-- Stock obsolète (> 12 mois)
SELECT
  f.code as filiale,
  a.reference,
  a.libelle,
  s.numero_serie,
  s.date_entree,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.date_entree)) * 12 +
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.date_entree)) as mois_en_stock
FROM stock_items s
JOIN filiales f ON f.id = s.filiale_id
JOIN articles a ON a.id = s.article_id
WHERE s.date_entree < CURRENT_DATE - INTERVAL '12 months'
ORDER BY s.date_entree;

-- =============================================================================
-- FIN DU SCRIPT
-- =============================================================================

-- RAPPEL : N'oubliez pas de créer les utilisateurs dans Supabase Auth Dashboard
-- avant d'exécuter ce script, et de remplacer les 'USER_ID_XXX' par les vrais IDs !

SELECT 'Script exécuté avec succès ! Vérifiez les résultats ci-dessus.' as message;
