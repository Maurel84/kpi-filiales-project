-- Add location metadata to auth_events.
ALTER TABLE auth_events
  ADD COLUMN IF NOT EXISTS time_zone text,
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lon double precision,
  ADD COLUMN IF NOT EXISTS geo_accuracy numeric(10,2);
