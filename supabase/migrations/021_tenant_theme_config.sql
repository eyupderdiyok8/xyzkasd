-- Tenant bazlı uygulama arayüz teması.
-- PDF rapor rengi ve widget renk ayarlarından bağımsızdır.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS "themeConfig" TEXT;
