-- ============================================================
-- Seed data for Water Purifier ERP
-- ============================================================
-- Run this AFTER the migration and after creating auth users via Supabase dashboard / API.
-- Replace UUIDs with actual auth.users IDs after creation.

-- 1. Create tenants
INSERT INTO tenants (id, name, slug, plan)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Ana Su Arıtma A.Ş.', 'ana-su', 'PROFESSIONAL'),
  ('a0000000-0000-0000-0000-000000000002', 'Temiz Su Hizmetleri Ltd.', 'temiz-su', 'STARTER')
ON CONFLICT (slug) DO NOTHING;

-- 2. Create profiles (requires auth.users to exist first)
-- Use Supabase Dashboard → Authentication → Add User or
-- the management API to create users, then update their profiles:
--
-- UPDATE public.profiles
-- SET role = 'super_admin', is_active = true
-- WHERE id = '<auth-user-uuid>';
--
-- UPDATE public.profiles
-- SET role = 'tenant_admin', tenant_id = 'a0000000-0000-0000-0000-000000000001'
-- WHERE id = '<auth-user-uuid>';
--
-- UPDATE public.profiles
-- SET role = 'manager', tenant_id = 'a0000000-0000-0000-0000-000000000001'
-- WHERE id = '<auth-user-uuid>';
--
-- UPDATE public.profiles
-- SET role = 'technician', tenant_id = 'a0000000-0000-0000-0000-000000000001'
-- WHERE id = '<auth-user-uuid>';
--
-- UPDATE public.profiles
-- SET role = 'viewer', tenant_id = 'a0000000-0000-0000-0000-000000000001'
-- WHERE id = '<auth-user-uuid>';
