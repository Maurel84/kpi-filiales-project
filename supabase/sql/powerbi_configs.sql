-- Table de configuration Power BI (à exécuter dans Supabase)
-- Stocke les paramètres embed par utilisateur (admin/manager) ou globalement.
create table if not exists public.powerbi_configs (
  id uuid primary key,
  embed_url text,
  dataset_id text,
  workspace_id text,
  updated_at timestamp with time zone default now()
);

-- Optionnel : policy RLS en lecture pour l'utilisateur connecté (si besoin de lecture filtrée)
-- alter table public.powerbi_configs enable row level security;
-- create policy "powerbi_configs_select_owner"
--   on public.powerbi_configs for select to authenticated
--   using (id = auth.uid());

comment on table public.powerbi_configs is 'Paramètres Power BI (embed URL, dataset, workspace).';
