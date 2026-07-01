-- ============================================================
-- Fix: Recreate profile for missing users + repair trigger
-- ============================================================

-- 1. Find the auth user id for tenant1@gmail.com
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'tenant1@gmail.com';

-- 2. Manually create the profile for tenant1 (replace <USER_ID> and <TENANT_ID>)
--    Get the tenant ID first:
SELECT id, name, slug FROM public.tenants LIMIT 5;

-- 3. Once you have the IDs, run this (replace placeholders):
/*
INSERT INTO public.profiles (id, email, full_name, role, tenant_id, is_active)
VALUES (
  '<USER_ID>',                          -- from step 1
  'tenant1@gmail.com',
  'Tenant Admin',
  'tenant_admin'::user_role,
  '<TENANT_ID>',                        -- from step 2
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = 'tenant_admin'::user_role,
  tenant_id = EXCLUDED.tenant_id,
  is_active = true,
  full_name = EXCLUDED.full_name;
*/

-- 4. Repair the trigger (in case it was dropped or broken)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'viewer'::user_role
    ),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify
SELECT u.id, u.email, p.role, p.tenant_id, p.is_active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tenant1@gmail.com';
