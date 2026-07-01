-- ============================================================
-- Water Purifier ERP — Tenant Plan (Starter / Professional)
-- ============================================================
-- Adds the plan column to support feature flag gating.
-- Existing tenants default to PROFESSIONAL to preserve access
-- to WhatsApp and automation features they may already use.
-- ============================================================

-- 1. Add plan column (default PROFESSIONAL for existing data)
ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'PROFESSIONAL';

-- 2. Backfill: new tenants default to STARTER via application layer
--    (the app creates tenants with 'STARTER' by default)

-- 3. Index for plan-based queries (optional, useful if filtering by plan)
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
