-- Add target and variance cause for KPI reporting.
alter table kpis_reporting
  add column if not exists cible numeric(15,2);

alter table kpis_reporting
  add column if not exists cause_ecart text;
