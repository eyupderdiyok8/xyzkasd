-- ============================================================
-- Water Purifier ERP — Audit Logs Table (PostgreSQL)
-- ============================================================
-- Tüm kritik CRUD işlemlerinin denetim günlüğü.
-- Kim, ne zaman, hangi IP'den, ne yaptı, eski/yeni değer.
-- ============================================================

-- 1. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id    UUID,
  action     TEXT NOT NULL,          -- 'CREATE' | 'UPDATE' | 'DELETE'
  entity     TEXT,                   -- entity type/table name (e.g. 'customer', 'device')
  entity_id  TEXT,                   -- record ID
  metadata   JSONB,                  -- JSON: old/new values
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- 3. RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant admins can read their own tenant's logs
CREATE POLICY audit_log_tenant_access ON audit_logs
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Only super_admins can INSERT (we'll insert via Prisma/service layer)
-- But we allow the service user (Supabase anon key with service_role) to insert
CREATE POLICY audit_log_service_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- 4. Auto-cleanup: keep logs for 1 year
-- (uncomment if you want automatic cleanup)
-- SELECT cron.schedule('audit-log-cleanup', '0 3 1 * *', $$
--   DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
-- $$);
