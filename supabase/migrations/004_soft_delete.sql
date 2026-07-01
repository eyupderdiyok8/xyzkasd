-- ============================================================
-- Water Purifier ERP — Soft Delete Columns (PostgreSQL)
-- ============================================================
-- Adds deleted_at TIMESTAMPTZ columns to tables that are
-- missing it for consistent logical deletion across all
-- main entities. Listeleme sorguları deleted_at IS NULL
-- filtresi içerir; admin panelinde silinen kayıtlar görülebilir.
-- ============================================================

-- 1. DevicePhoto
ALTER TABLE device_photos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. ServicePhoto
ALTER TABLE service_photos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. FilterChange
ALTER TABLE filter_changes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 4. InventoryTransaction
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 5. AutomationLog
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
