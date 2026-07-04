-- Migration 023: Teknisyen canli konum takibi
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
