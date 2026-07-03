-- ============================================================
-- Tamir Script'i — ADIM ADIM çalıştır
-- ============================================================

-- ══════════ ÖNCE BUNU TEK BAŞINA ÇALIŞTIR ══════════

-- Eksik sütunları ekle
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS "membershipType" TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS "membershipExpiresAt" TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS "themeConfig" TEXT;

-- Eski plan → membershipType dönüşümü (plan sütunu varsa)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'plan') THEN
    UPDATE public.tenants SET "membershipType" = 'YEARLY' WHERE plan = 'PROFESSIONAL';
    UPDATE public.tenants SET "membershipType" = 'MONTHLY' WHERE plan = 'STARTER';
  END IF;
END $$;

SELECT '✅ Sütunlar eklendi' AS sonuc;


-- ══════════ SONRA BUNU TEK BAŞINA ÇALIŞTIR ══════════

-- Tenant oluştur (yoksa)
INSERT INTO public.tenants (id, name, slug, "membershipType", is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Ana Su Arıtma A.Ş.', 'ana-su', 'YEARLY', true),
  ('a0000000-0000-0000-0000-000000000002', 'Temiz Su Hizmetleri Ltd.', 'temiz-su', 'MONTHLY', true)
ON CONFLICT (slug) DO UPDATE SET
  "membershipType" = EXCLUDED."membershipType",
  is_active = true;

SELECT '✅ Tenant''lar hazır' AS sonuc;


-- ══════════ PROFİL BAĞLAMA ══════════

-- tenant1@gmail.com → ana-su firmasına tenant_admin
UPDATE public.profiles
SET 
  role = 'tenant_admin'::user_role,
  tenant_id = 'a0000000-0000-0000-0000-000000000001',
  is_active = true,
  full_name = COALESCE(full_name, 'Tenant Admin')
WHERE email = 'tenant1@gmail.com';

-- Eğer tenant1 profili hiç yoksa oluştur
INSERT INTO public.profiles (id, email, full_name, role, tenant_id, is_active)
SELECT 
  u.id, u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Tenant Admin'),
  'tenant_admin'::user_role,
  'a0000000-0000-0000-0000-000000000001',
  true
FROM auth.users u
WHERE u.email = 'tenant1@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

SELECT '✅ Profiller bağlandı' AS sonuc;


-- ══════════ DOĞRULAMA ══════════

SELECT id, email, role FROM public.profiles ORDER BY role, email;

SELECT id, name, slug, "membershipType"
FROM public.tenants 
WHERE is_active = true;


-- ══════════ TRIGGER DÜZELTMESİ ══════════
-- handle_new_user trigger'ı search_path='' ile çalıştığı için
-- user_role enum tipini bulamıyor → user create 500 hatası.
-- Düzeltme: public şemasını search_path'e ekle.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
BEGIN
  v_tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::UUID;
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');

  INSERT INTO public.profiles (id, email, full_name, role, tenant_id, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    v_tenant_id,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = COALESCE(EXCLUDED.role, profiles.role),
    tenant_id = COALESCE(EXCLUDED.tenant_id, profiles.tenant_id),
    updated_at = now();

  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Trigger düzeltildi (search_path = public)' AS sonuc;
