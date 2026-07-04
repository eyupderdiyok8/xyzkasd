-- Migration 024: Teknisyen konum paylaşım durumunu takip et
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS location_sharing_enabled BOOLEAN NOT NULL DEFAULT false;
