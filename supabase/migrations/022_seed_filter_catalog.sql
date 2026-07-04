-- ============================================================
-- Migration 022: Standart Filtre Kataloğu
-- Her tenant için varsayılan su arıtma filtre türlerini ekler.
-- ============================================================

-- Yeni tenant'lar için trigger: tenant oluşturulunca otomatik filtre kataloğu ekle
CREATE OR REPLACE FUNCTION public.seed_filter_catalog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.filter_catalogs (id, "tenantId", name, stage, "sortOrder", "isActive")
  VALUES
    (gen_random_uuid()::text, NEW.id, 'Sediment Filtre',       'SEDIMENT',      1, true),
    (gen_random_uuid()::text, NEW.id, 'Karbon Blok Filtre',    'CARBON_BLOCK',  2, true),
    (gen_random_uuid()::text, NEW.id, 'Granül Aktif Karbon',   'GAC',           3, true),
    (gen_random_uuid()::text, NEW.id, 'Membran (RO)',          'MEMBRANE',      4, true),
    (gen_random_uuid()::text, NEW.id, 'Post Karbon Filtre',    'POST_CARBON',   5, true),
    (gen_random_uuid()::text, NEW.id, 'Alkalin Filtre',        'ALKALINE',      6, true),
    (gen_random_uuid()::text, NEW.id, 'Mineral Filtre',        'MINERAL',       7, true),
    (gen_random_uuid()::text, NEW.id, 'UV Sterilizasyon',      'UV',            8, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_filter_catalog ON public.tenants;
CREATE TRIGGER trg_seed_filter_catalog
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_filter_catalog();

-- Mevcut tenant'lara filtre kataloğu ekle (yoksa)
INSERT INTO public.filter_catalogs (id, "tenantId", name, stage, "sortOrder", "isActive")
SELECT gen_random_uuid()::text, t.id, fc.name, fc.stage, fc.sort_order, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('Sediment Filtre',       'SEDIMENT',      1),
  ('Karbon Blok Filtre',    'CARBON_BLOCK',  2),
  ('Granül Aktif Karbon',   'GAC',           3),
  ('Membran (RO)',          'MEMBRANE',      4),
  ('Post Karbon Filtre',    'POST_CARBON',   5),
  ('Alkalin Filtre',        'ALKALINE',      6),
  ('Mineral Filtre',        'MINERAL',       7),
  ('UV Sterilizasyon',      'UV',            8)
) AS fc(name, stage, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.filter_catalogs existing
  WHERE existing."tenantId" = t.id AND existing.stage = fc.stage
);

SELECT '✅ Filtre kataloğu eklendi' AS sonuc;
