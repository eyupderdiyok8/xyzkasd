-- ============================================================
-- Fix: Tenant admin profile update permission + repair existing rows
-- ============================================================

-- 1. Add a new RLS policy: tenant_admin can update profiles in their own tenant.
--    (super_admin still has its own policy that covers any tenant)
--    This allows tenant_admin to invite/manage users in their firm.
CREATE POLICY "Tenant admins can update profiles in own tenant"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'tenant_admin'
        AND p.tenant_id = profiles.tenant_id
    )
  );

-- 2. Backfill: any profile with role set but tenant_id null AND
--    is_active = true is a broken invite. Repair by activating and
--    (optionally) assigning the first tenant.
--    THIS IS A ONE-OFF FIX — review before running.
DO $$
DECLARE
  v_first_tenant UUID;
BEGIN
  -- Pick the first available tenant as a fallback
  SELECT id INTO v_first_tenant FROM public.tenants ORDER BY created_at LIMIT 1;

  -- Repair profiles with is_active = true but missing tenant_id
  -- (these were created by the trigger but the invite API update was blocked by RLS)
  UPDATE public.profiles
  SET tenant_id = COALESCE(tenant_id, v_first_tenant)
  WHERE is_active = true AND tenant_id IS NULL;

  -- Make sure all profiles have is_active = true (the invite API intended this)
  UPDATE public.profiles SET is_active = true WHERE is_active IS NOT true;
END $$;

-- 3. Verify: list all profiles with their state
SELECT id, email, role, tenant_id, is_active, created_at
FROM public.profiles
ORDER BY created_at DESC;
