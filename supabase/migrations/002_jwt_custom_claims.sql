-- ============================================================
-- Water Purifier ERP — JWT Custom Claims (tenant_id + role)
-- ============================================================
-- This migration syncs tenant_id and role from public.profiles
-- into auth.users.raw_app_meta_data so they appear in the JWT.
--
-- Supabase automatically includes raw_app_meta_data in the
-- access token JWT. After this migration, the JWT will contain:
--   { "sub": "<user_id>", "app_metadata": { "tenant_id": "...", "role": "..." }, ... }
-- ============================================================

-- 1. Sync function: copies tenant_id + role from profiles → auth.users raw_app_meta_data
CREATE OR REPLACE FUNCTION public.sync_jwt_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _tenant_id TEXT;
  _role      TEXT;
BEGIN
  -- Read from NEW (insert/update) or OLD (delete)
  _tenant_id := COALESCE(NEW.tenant_id::TEXT, '');
  _role      := COALESCE(NEW.role::TEXT, 'viewer');

  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('tenant_id', _tenant_id, 'role', _role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 2. Trigger: fires after INSERT or UPDATE on profiles
DROP TRIGGER IF EXISTS sync_jwt_claims_trigger ON public.profiles;
CREATE TRIGGER sync_jwt_claims_trigger
  AFTER INSERT OR UPDATE OF tenant_id, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_jwt_claims();

-- 3. Backfill existing profiles: sync all existing users' JWT claims
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, tenant_id::TEXT AS tenant_id, role::TEXT AS role FROM public.profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('tenant_id', COALESCE(r.tenant_id, ''), 'role', COALESCE(r.role, 'viewer'))
    WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Helper function: extract tenant_id from JWT (for RLS policies)
-- This reads the claim set by Supabase in the transaction-local config
CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
    ''
  );
$$;

-- 5. Helper: extract role from JWT
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    'viewer'
  );
$$;
