# Guide d'Import des Données Forecast

Ce guide explique comment importer les données du fichier `forecast.csv` dans la base de données Supabase.

## Structure des Données

Le fichier `forecast.csv` contient :
- **Historique des ventes** : 2017-2024 par modèle de produit
- **Prévisions 2026** : Par mois (Janvier à Décembre) pour chaque modèle
- **3 marques** : Manitou, Kalmar, Massey Ferguson
- **Catégories multiples** : Chariots, Télescopiques, Tracteurs, Nacelles, etc.

### Format du CSV

```
Marque;Catégorie;Modèle;2017;2018;2019;2020;2021;2022;2023;2024;Jan;Fev;Mar;...Dec
```

Séparateur : `;` (point-virgule)

## Tables Créées

Les tables suivantes sont prêtes à recevoir les données :

### 1. `marques`
Marques de produits déjà insérées :
- Manitou
- Kalmar
- Massey Ferguson

### 2. `categories_produits`
Catégories par marque déjà insérées :
- **Manitou** : MI-X, M-X, MC-X, MLT-X, MT-X, MXT, MHT-X, etc.
- **Kalmar** : FLT_ECG, FLT_DCG, ECH, RST, TT, etc.
- **Massey Ferguson** : MF300, MF400, MF4700, MF5700, MF6700, etc.

### 3. `modeles_produits`
Catalogue des modèles (à remplir via import)
- Colonnes : code_modele, nom_complet, marque_id, categorie_id, puissance_cv, caracteristiques

### 4. `historique_ventes_modeles`
Historique des ventes réelles par année
- Colonnes : modele_id, annee, quantite_vendue, filiale_id (optionnel)

### 5. `previsions_ventes_modeles`
Prévisions mensuelles
- Colonnes : modele_id, annee, mois, quantite_prevue, type_prevision

## Méthode d'Import

### Option 1 : Script Python (Recommandé)

```python
import pandas as pd
from supabase import create_client, Client

# Configuration
SUPABASE_URL = "https://iisxowebuecfwmsmfeqe.supabase.co"
SUPABASE_KEY = "votre_service_role_key"  # Clé service role (pas anon key)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Lire le CSV
df = pd.read_csv('data/forecast.csv', sep=';', encoding='utf-8')

# Récupérer les IDs des marques
marques = supabase.table('marques').select('*').execute()
marque_map = {m['nom']: m['id'] for m in marques.data}

categories = supabase.table('categories_produits').select('*').execute()
categorie_map = {(c['marque_id'], c['code']): c['id'] for c in categories.data}

# Fonction pour insérer un modèle
def insert_modele(row):
    # Déterminer la marque
    marque = 'Manitou'  # À adapter selon la logique du CSV

    if 'Kalmar' in str(row.get('Catégorie', '')):
        marque = 'Kalmar'
    elif 'MF' in str(row.get('Modèle', '')):
        marque = 'Massey Ferguson'

    marque_id = marque_map.get(marque)
    if not marque_id:
        return None

    # Insérer le modèle
    modele_data = {
        'marque_id': marque_id,
        'code_modele': row['Modèle'],
        'nom_complet': f"{row['Catégorie']} {row['Modèle']}",
        'actif': True
    }

    result = supabase.table('modeles_produits').insert(modele_data).execute()
    return result.data[0]['id'] if result.data else None

# Fonction pour insérer l'historique
def insert_historique(modele_id, row):
    for year in range(2017, 2025):
        col_name = str(year)
        if col_name in row and pd.notna(row[col_name]) and row[col_name] > 0:
            hist_data = {
                'modele_id': modele_id,
                'annee': year,
                'quantite_vendue': int(row[col_name]),
                'code_modele': row['Modèle']
            }
            supabase.table('historique_ventes_modeles').insert(hist_data).execute()

# Fonction pour insérer les prévisions
def insert_previsions(modele_id, row):
    mois_map = {
        'Jan': 1, 'Fev': 2, 'Mar': 3, 'Avr': 4, 'Mai': 5, 'Jui': 6,
        'Juil': 7, 'Aou': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    }

    for mois_nom, mois_num in mois_map.items():
        if mois_nom in row and pd.notna(row[mois_nom]) and row[mois_nom] > 0:
            prev_data = {
                'modele_id': modele_id,
                'annee': 2026,
                'mois': mois_num,
                'quantite_prevue': int(row[mois_nom]),
                'type_prevision': 'Forecast',
                'code_modele': row['Modèle']
            }
            supabase.table('previsions_ventes_modeles').insert(prev_data).execute()

# Traiter chaque ligne du CSV
for index, row in df.iterrows():
    if pd.notna(row.get('Modèle')):
        print(f"Traitement: {row['Modèle']}")

        # Insérer le modèle
        modele_id = insert_modele(row)

        if modele_id:
            # Insérer l'historique
            insert_historique(modele_id, row)

            # Insérer les prévisions
            insert_previsions(modele_id, row)

        # Pause pour éviter le rate limiting
        time.sleep(0.1)

print("Import terminé!")
```

### Option 2 : Import SQL Direct

Si vous préférez SQL, vous pouvez préparer un script d'insertion :

```sql
-- Exemple pour un modèle Manitou MI-X 18D
DO $$
DECLARE
  v_manitou_id UUID;
  v_categorie_id UUID;
  v_modele_id UUID;
BEGIN
  -- Récupérer les IDs
  SELECT id INTO v_manitou_id FROM marques WHERE code = 'MANITOU';
  SELECT id INTO v_categorie_id FROM categories_produits WHERE code = 'MI-X';

  -- Insérer le modèle
  INSERT INTO modeles_produits (marque_id, categorie_id, code_modele, nom_complet, actif)
  VALUES (v_manitou_id, v_categorie_id, '18D TLL47', 'MI-X 18D TLL47', true)
  RETURNING id INTO v_modele_id;

  -- Insérer l'historique (exemple 2019-2024)
  INSERT INTO historique_ventes_modeles (modele_id, code_modele, annee, quantite_vendue) VALUES
    (v_modele_id, '18D TLL47', 2019, 1),
    (v_modele_id, '18D TLL47', 2022, 2),
    (v_modele_id, '18D TLL47', 2023, 3),
    (v_modele_id, '18D TLL47', 2024, 2);

  -- Insérer les prévisions 2026
  INSERT INTO previsions_ventes_modeles (modele_id, code_modele, annee, mois, quantite_prevue, type_prevision) VALUES
    (v_modele_id, '18D TLL47', 2026, 1, 2, 'Forecast');

END $$;
```

### Option 3 : Interface Web (À développer)

Une interface d'import sera disponible dans le module admin permettant :
- Upload du fichier CSV
- Validation des données
- Mapping automatique marque/catégorie
- Import progressif avec barre de progression
- Rapport d'erreurs

## Validation Post-Import

Une fois l'import terminé, vérifier avec ces requêtes :

```sql
-- Nombre total de modèles importés
SELECT COUNT(*) FROM modeles_produits;

-- Nombre de ventes par marque
SELECT
  m.nom as marque,
  COUNT(DISTINCT hvm.modele_id) as nb_modeles,
  SUM(hvm.quantite_vendue) as total_ventes
FROM historique_ventes_modeles hvm
JOIN modeles_produits mp ON mp.id = hvm.modele_id
JOIN marques m ON m.id = mp.marque_id
GROUP BY m.nom;

-- Prévisions 2026 par marque
SELECT
  m.nom as marque,
  COUNT(DISTINCT pvm.modele_id) as nb_modeles,
  SUM(pvm.quantite_prevue) as total_previsions
FROM previsions_ventes_modeles pvm
JOIN modeles_produits mp ON mp.id = pvm.modele_id
JOIN marques m ON m.id = mp.marque_id
WHERE pvm.annee = 2026
GROUP BY m.nom;

-- Top 10 modèles les plus vendus en 2024
SELECT
  m.nom as marque,
  mp.nom_complet,
  hvm.quantite_vendue
FROM historique_ventes_modeles hvm
JOIN modeles_produits mp ON mp.id = hvm.modele_id
JOIN marques m ON m.id = mp.marque_id
WHERE hvm.annee = 2024
ORDER BY hvm.quantite_vendue DESC
LIMIT 10;
```

## Affectation par Filiale (Optionnel)

Si vous souhaitez affecter les ventes historiques et prévisions à des filiales spécifiques :

```sql
-- Exemple : Affecter toutes les ventes à la filiale Côte d'Ivoire
UPDATE historique_ventes_modeles
SET filiale_id = (SELECT id FROM filiales WHERE code = 'FIL-A')
WHERE filiale_id IS NULL;

UPDATE previsions_ventes_modeles
SET filiale_id = (SELECT id FROM filiales WHERE code = 'FIL-A')
WHERE filiale_id IS NULL;
```

Ou répartir par marque :
- Manitou → Filiale A (CI)
- Kalmar → Filiale B (Sénégal)
- Massey Ferguson → Filiale C (Cameroun)

## Maintenance

### Mettre à jour les prévisions mensuelles

```sql
-- Ajuster une prévision
UPDATE previsions_ventes_modeles
SET quantite_prevue = 5, modifie_par_id = 'USER_ID', date_modification = NOW()
WHERE modele_id = 'MODELE_ID' AND annee = 2026 AND mois = 1;
```

### Ajouter une nouvelle année de prévisions

```sql
-- Dupliquer 2026 vers 2027 avec ajustement +10%
INSERT INTO previsions_ventes_modeles (
  filiale_id, marque_id, categorie_id, modele_id, code_modele,
  annee, mois, quantite_prevue, type_prevision
)
SELECT
  filiale_id, marque_id, categorie_id, modele_id, code_modele,
  2027 as annee, mois, CEILING(quantite_prevue * 1.1) as quantite_prevue, type_prevision
FROM previsions_ventes_modeles
WHERE annee = 2026;
```

## Notes Importantes

1. **Clé Service Role** : Pour l'import massif, utilisez la clé `service_role` (disponible dans Supabase Dashboard > Settings > API), pas la clé `anon`.

2. **Rate Limiting** : Supabase a des limites de requêtes. Ajoutez des pauses (`time.sleep(0.1)`) entre les insertions.

3. **Transactions** : Si une erreur survient, certaines données peuvent être partiellement importées. Pensez à nettoyer avant de réessayer :
   ```sql
   DELETE FROM previsions_ventes_modeles;
   DELETE FROM historique_ventes_modeles;
   DELETE FROM modeles_produits;
   ```

4. **Backup** : Avant l'import, faire un export de la base via Supabase Dashboard > Database > Backups.

## Support

En cas de problème avec l'import :
1. Vérifier les logs dans Supabase Dashboard > Logs
2. Vérifier les politiques RLS (désactiver temporairement pour admin)
3. Consulter la documentation Supabase

---

**L'application est prête à recevoir les données !**
Après l'import, les modules **Forecasts** et **PDM** afficheront automatiquement les statistiques et graphiques.
