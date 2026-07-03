-- ============================================================
-- Fix: handle_new_user trigger'a tenant_id desteği eklendi
-- ============================================================

-- Güncellenmiş trigger: raw_user_meta_data içinde tenant_id varsa otomatik ata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- tenant_id'yi user_metadata'dan al (varsa)
  v_tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::UUID;

  INSERT INTO public.profiles (id, email, full_name, role, tenant_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'viewer'::user_role
    ),
    v_tenant_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = COALESCE(EXCLUDED.role, profiles.role),
    tenant_id = COALESCE(EXCLUDED.tenant_id, profiles.tenant_id),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mevcut tenant_admin kullanıcılarını tamir et (tenant_id null olanlar)
-- Her tenant için en az bir tenant_admin olduğunu varsayıyoruz.
-- Eğer profil.tenant_id null + tenant.id eşleşen bir tenant varsa güncelle.
-- Bu otomatik tamir DEĞİLDİR — manuel çalıştırma içindir.
--
-- UPDATE public.profiles p
-- SET tenant_id = (
--   SELECT t.id FROM public.tenants t
--   WHERE t.slug = '<tenant-slug>'
--   LIMIT 1
-- )
-- WHERE p.email = 'tenant1@gmail.com' AND p.tenant_id IS NULL;
