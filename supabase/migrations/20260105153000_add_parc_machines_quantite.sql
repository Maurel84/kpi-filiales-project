-- Add quantity tracking to parc_machines.
ALTER TABLE parc_machines
  ADD COLUMN IF NOT EXISTS quantite numeric(10,2) NOT NULL DEFAULT 1;
