/*
  Seed articles from modeles_produits so selection lists have data.
  Ensure all authenticated users can read articles.
*/

-- Read access for all authenticated users.
DROP POLICY IF EXISTS "Tous lisent articles" ON articles;
CREATE POLICY "Tous lisent articles"
  ON articles FOR SELECT
  TO authenticated
  USING (true);

-- Ensure expected columns exist (defensive for legacy schema).
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS libelle text,
  ADD COLUMN IF NOT EXISTS categorie text,
  ADD COLUMN IF NOT EXISTS marque text,
  ADD COLUMN IF NOT EXISTS modele text,
  ADD COLUMN IF NOT EXISTS actif boolean DEFAULT true;

UPDATE articles
SET
  designation = COALESCE(designation, libelle, reference),
  libelle = COALESCE(libelle, designation, reference)
WHERE designation IS NULL OR libelle IS NULL;

-- Seed articles when missing (reference is unique).
INSERT INTO articles (reference, designation, libelle, categorie, marque, modele, actif)
SELECT
  UPPER(REGEXP_REPLACE(CONCAT_WS('-', m.code, mp.code_modele), '[^A-Za-z0-9]+', '-', 'g')),
  CONCAT_WS(' ', m.nom, mp.nom_complet),
  CONCAT_WS(' ', m.nom, mp.nom_complet),
  'Machine',
  m.nom,
  mp.code_modele,
  COALESCE(mp.actif, true)
FROM modeles_produits mp
JOIN marques m ON m.id = mp.marque_id
ON CONFLICT (reference) DO NOTHING;
