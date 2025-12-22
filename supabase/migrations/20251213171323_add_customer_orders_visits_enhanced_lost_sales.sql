/*
  # Add Customer Orders, Visits, and Enhanced Lost Sales Tracking

  1. New Tables
    - `commandes_clients`
      - Customer orders tracking with billing forecast
      - Links to clients, products, salespeople
      - Tracks order status and expected billing dates
    
    - `visites_clients`
      - Customer visits and contact information
      - Complete contact details (phone, whatsapp, email, company URL)
      - Links to user who made the visit
    
    - `opportunites`
      - Sales opportunities tracking
      - Project details, potential revenue, margin
      - Status tracking (Won, In Progress, Postponed, Abandoned, Lost)
      - Closure probability tracking
  
  2. Updates to Existing Tables
    - Enhanced `ventes_perdues` with competitor information
    - Added participation tracking (participated/not participated)
    - Added competitor brand, model, price, and comments
  
  3. Security
    - Enable RLS on all new tables
    - Role-based access policies (commercial, manager, admin)
*/

-- Commandes Clients (Customer Orders)
CREATE TABLE IF NOT EXISTS commandes_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  numero_commande text NOT NULL,
  date_commande date NOT NULL DEFAULT CURRENT_DATE,
  client_nom text NOT NULL,
  marque_id uuid REFERENCES marques(id),
  modele text,
  numero_serie text,
  gamme text,
  pays text,
  vendeur_id uuid REFERENCES users_profiles(id),
  ca_ht_prevu decimal(15,2),
  devise text DEFAULT 'XAF',
  prevision_facturation date,
  statut text DEFAULT 'En_cours' CHECK (statut IN ('En_cours', 'Facture', 'Annule', 'Livre')),
  commentaires text,
  created_by_id uuid REFERENCES users_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commandes_clients_filiale ON commandes_clients(filiale_id);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_date ON commandes_clients(date_commande);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_vendeur ON commandes_clients(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_clients_statut ON commandes_clients(statut);

-- Visites Clients (Customer Visits)
CREATE TABLE IF NOT EXISTS visites_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  date_visite date NOT NULL DEFAULT CURRENT_DATE,
  nom_client text NOT NULL,
  prenom_client text,
  fonction_client text,
  telephone_client text,
  whatsapp_client text,
  email_client text,
  url_societe_client text,
  notes text,
  visite_par_id uuid REFERENCES users_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visites_clients_filiale ON visites_clients(filiale_id);
CREATE INDEX IF NOT EXISTS idx_visites_clients_date ON visites_clients(date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_clients_visite_par ON visites_clients(visite_par_id);

-- Opportunités (Sales Opportunities)
CREATE TABLE IF NOT EXISTS opportunites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  visite_id uuid REFERENCES visites_clients(id) ON DELETE SET NULL,
  nom_projet text NOT NULL,
  ville text,
  marques text[],
  modeles text[],
  quantites integer,
  ca_ht_potentiel decimal(15,2),
  devise text DEFAULT 'XAF',
  pourcentage_marge decimal(5,2),
  date_closing_prevue date,
  statut text DEFAULT 'En_cours' CHECK (statut IN ('Gagne', 'En_cours', 'Reporte', 'Abandonne', 'Perdu')),
  taux_cloture_percent decimal(5,2) DEFAULT 0,
  notes text,
  created_by_id uuid REFERENCES users_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunites_filiale ON opportunites(filiale_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_statut ON opportunites(statut);
CREATE INDEX IF NOT EXISTS idx_opportunites_date_closing ON opportunites(date_closing_prevue);

-- Add columns to existing ventes_perdues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventes_perdues' AND column_name = 'a_participe'
  ) THEN
    ALTER TABLE ventes_perdues ADD COLUMN a_participe boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventes_perdues' AND column_name = 'marque_concurrent'
  ) THEN
    ALTER TABLE ventes_perdues ADD COLUMN marque_concurrent text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventes_perdues' AND column_name = 'modele_concurrent'
  ) THEN
    ALTER TABLE ventes_perdues ADD COLUMN modele_concurrent text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventes_perdues' AND column_name = 'prix_concurrent'
  ) THEN
    ALTER TABLE ventes_perdues ADD COLUMN prix_concurrent decimal(15,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ventes_perdues' AND column_name = 'commentaires_analyse'
  ) THEN
    ALTER TABLE ventes_perdues ADD COLUMN commentaires_analyse text;
  END IF;
END $$;

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commandes_clients_updated_at
  BEFORE UPDATE ON commandes_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_visites_clients_updated_at
  BEFORE UPDATE ON visites_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_opportunites_updated_at
  BEFORE UPDATE ON opportunites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

ALTER TABLE commandes_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;

-- Commandes Clients Policies
CREATE POLICY "Admin siège can view all customer orders"
  ON commandes_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role = 'admin_siege'
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Users can view customer orders from their branch"
  ON commandes_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.filiale_id = commandes_clients.filiale_id
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Commercial and managers can create customer orders"
  ON commandes_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('commercial', 'manager_filiale', 'admin_siege')
      AND users_profiles.filiale_id = commandes_clients.filiale_id
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Commercial and managers can update customer orders"
  ON commandes_clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('commercial', 'manager_filiale', 'admin_siege')
      AND users_profiles.actif = true
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = commandes_clients.filiale_id
      )
    )
  );

CREATE POLICY "Managers can delete customer orders"
  ON commandes_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('manager_filiale', 'admin_siege')
      AND users_profiles.actif = true
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = commandes_clients.filiale_id
      )
    )
  );

-- Visites Clients Policies
CREATE POLICY "Users can view visits from their branch"
  ON visites_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = visites_clients.filiale_id
      )
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Users can create visits for their branch"
  ON visites_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.filiale_id = visites_clients.filiale_id
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Users can update their own visits"
  ON visites_clients FOR UPDATE
  TO authenticated
  USING (
    visite_par_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('manager_filiale', 'admin_siege')
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = visites_clients.filiale_id
      )
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Managers can delete visits"
  ON visites_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('manager_filiale', 'admin_siege')
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = visites_clients.filiale_id
      )
      AND users_profiles.actif = true
    )
  );

-- Opportunités Policies
CREATE POLICY "Users can view opportunities from their branch"
  ON opportunites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = opportunites.filiale_id
      )
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Users can create opportunities for their branch"
  ON opportunites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.filiale_id = opportunites.filiale_id
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Users can update opportunities they created"
  ON opportunites FOR UPDATE
  TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('manager_filiale', 'admin_siege')
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = opportunites.filiale_id
      )
      AND users_profiles.actif = true
    )
  );

CREATE POLICY "Managers can delete opportunities"
  ON opportunites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles
      WHERE users_profiles.id = auth.uid()
      AND users_profiles.role IN ('manager_filiale', 'admin_siege')
      AND (
        users_profiles.role = 'admin_siege'
        OR users_profiles.filiale_id = opportunites.filiale_id
      )
      AND users_profiles.actif = true
    )
  );
