-- 013_enable_rls.sql
-- Tüm public tablolara Row-Level Security + tenant izolasyonu
-- Prisma (direkt bağlantı): session variable yok → RLS pas geçilir
-- Supabase API (PostgREST): JWT'den gelen tenant_id → RLS aktif
-- NOT: Sadece profiles.* kolonlarında @map var (tenant_id, full_name vs.)
--      Diğer tüm tablolarda kolon adı = Prisma field adı (camelCase)

begin;

create or replace function public.is_same_tenant(row_tenant_id text)
returns boolean language sql stable as $$
  select current_setting('app.current_tenant_id', true) is null
      or current_setting('app.current_tenant_id', true) = ''
      or current_setting('app.current_tenant_id', true) = row_tenant_id;
$$;

-- ── Enable RLS ────────────────────────────────

alter table tenants                enable row level security;
alter table profiles               enable row level security;
alter table users                  enable row level security;
alter table devices                enable row level security;
alter table device_photos          enable row level security;
alter table tds_readings           enable row level security;
alter table technicians            enable row level security;
alter table customers              enable row level security;
alter table customer_addresses     enable row level security;
alter table customer_phones        enable row level security;
alter table service_tickets        enable row level security;
alter table service_photos         enable row level security;
alter table filter_catalogs        enable row level security;
alter table filter_changes         enable row level security;
alter table device_filters         enable row level security;
alter table device_maintenance     enable row level security;
alter table maintenance_reminders  enable row level security;
alter table inventory_items        enable row level security;
alter table inventory_transactions enable row level security;
alter table coupons                enable row level security;
alter table coupon_usages          enable row level security;
alter table service_surveys        enable row level security;
alter table message_templates      enable row level security;
alter table whatsapp_sessions      enable row level security;
alter table automation_rules       enable row level security;
alter table automation_logs        enable row level security;
alter table audit_logs             enable row level security;

-- ── Policies ──────────────────────────────────

-- tenants: uses id
drop policy if exists tenants_tenant_isolation on tenants;
create policy tenants_tenant_isolation on tenants
  for all using (public.is_same_tenant(id));

-- profiles: @map("tenant_id")
drop policy if exists profiles_tenant_isolation on profiles;
create policy profiles_tenant_isolation on profiles
  for all using (public.is_same_tenant(tenant_id));

-- All other tables: "tenantId" (Prisma default camelCase)
drop policy if exists users_tenant_isolation on users;
create policy users_tenant_isolation on users
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists devices_tenant_isolation on devices;
create policy devices_tenant_isolation on devices
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists device_photos_tenant_isolation on device_photos;
create policy device_photos_tenant_isolation on device_photos
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists tds_readings_tenant_isolation on tds_readings;
create policy tds_readings_tenant_isolation on tds_readings
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists technicians_tenant_isolation on technicians;
create policy technicians_tenant_isolation on technicians
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists customers_tenant_isolation on customers;
create policy customers_tenant_isolation on customers
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists customer_addresses_tenant_isolation on customer_addresses;
create policy customer_addresses_tenant_isolation on customer_addresses
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists customer_phones_tenant_isolation on customer_phones;
create policy customer_phones_tenant_isolation on customer_phones
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists service_tickets_tenant_isolation on service_tickets;
create policy service_tickets_tenant_isolation on service_tickets
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists service_photos_tenant_isolation on service_photos;
create policy service_photos_tenant_isolation on service_photos
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists filter_catalogs_tenant_isolation on filter_catalogs;
create policy filter_catalogs_tenant_isolation on filter_catalogs
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists filter_changes_tenant_isolation on filter_changes;
create policy filter_changes_tenant_isolation on filter_changes
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists device_filters_tenant_isolation on device_filters;
create policy device_filters_tenant_isolation on device_filters
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists device_maintenance_tenant_isolation on device_maintenance;
create policy device_maintenance_tenant_isolation on device_maintenance
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists maintenance_reminders_tenant_isolation on maintenance_reminders;
create policy maintenance_reminders_tenant_isolation on maintenance_reminders
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists inventory_items_tenant_isolation on inventory_items;
create policy inventory_items_tenant_isolation on inventory_items
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists inventory_transactions_tenant_isolation on inventory_transactions;
create policy inventory_transactions_tenant_isolation on inventory_transactions
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists coupons_tenant_isolation on coupons;
create policy coupons_tenant_isolation on coupons
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists coupon_usages_tenant_isolation on coupon_usages;
create policy coupon_usages_tenant_isolation on coupon_usages
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists service_surveys_tenant_isolation on service_surveys;
create policy service_surveys_tenant_isolation on service_surveys
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists message_templates_tenant_isolation on message_templates;
create policy message_templates_tenant_isolation on message_templates
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists whatsapp_sessions_tenant_isolation on whatsapp_sessions;
create policy whatsapp_sessions_tenant_isolation on whatsapp_sessions
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists automation_rules_tenant_isolation on automation_rules;
create policy automation_rules_tenant_isolation on automation_rules
  for all using (public.is_same_tenant("tenantId"));

drop policy if exists automation_logs_tenant_isolation on automation_logs;
create policy automation_logs_tenant_isolation on automation_logs
  for all using (public.is_same_tenant("tenantId"));

-- audit_logs: nullable "tenantId"
drop policy if exists audit_logs_tenant_isolation on audit_logs;
create policy audit_logs_tenant_isolation on audit_logs
  for all using ("tenantId" is null or public.is_same_tenant("tenantId"));

-- ── Indexes ───────────────────────────────────
-- Column names match Prisma field names (camelCase) unless @map'd

create index if not exists idx_profiles_tenant_id               on profiles(tenant_id);
create index if not exists idx_users_tenant_id                  on users("tenantId");
create index if not exists idx_devices_tenant_id                on devices("tenantId");
create index if not exists idx_devices_customer_id              on devices("customerId");
create index if not exists idx_device_photos_tenant_id          on device_photos("tenantId");
create index if not exists idx_device_photos_device_id          on device_photos("deviceId");
create index if not exists idx_tds_readings_tenant_id           on tds_readings("tenantId");
create index if not exists idx_tds_readings_device_id           on tds_readings("deviceId");
create index if not exists idx_tds_readings_recorded_at         on tds_readings("recordedAt");
create index if not exists idx_technicians_tenant_id            on technicians("tenantId");
create index if not exists idx_customers_tenant_id              on customers("tenantId");
create index if not exists idx_customer_addresses_tenant_id     on customer_addresses("tenantId");
create index if not exists idx_customer_phones_tenant_id        on customer_phones("tenantId");
create index if not exists idx_service_tickets_tenant_id        on service_tickets("tenantId");
create index if not exists idx_service_photos_tenant_id         on service_photos("tenantId");
create index if not exists idx_filter_catalogs_tenant_id        on filter_catalogs("tenantId");
create index if not exists idx_filter_changes_tenant_id         on filter_changes("tenantId");
create index if not exists idx_device_filters_tenant_id         on device_filters("tenantId");
create index if not exists idx_device_maintenance_tenant_id     on device_maintenance("tenantId");
create index if not exists idx_maintenance_reminders_tenant_id  on maintenance_reminders("tenantId");
create index if not exists idx_inventory_items_tenant_id        on inventory_items("tenantId");
create index if not exists idx_inventory_transactions_tenant_id on inventory_transactions("tenantId");
create index if not exists idx_inventory_transactions_item_id   on inventory_transactions("itemId");
create index if not exists idx_inventory_transactions_created_at on inventory_transactions("createdAt");
create index if not exists idx_coupons_tenant_id                on coupons("tenantId");
create index if not exists idx_coupon_usages_tenant_id          on coupon_usages("tenantId");
create index if not exists idx_service_surveys_tenant_id        on service_surveys("tenantId");
create index if not exists idx_message_templates_tenant_id      on message_templates("tenantId");
create index if not exists idx_whatsapp_sessions_tenant_id      on whatsapp_sessions("tenantId");
create index if not exists idx_automation_rules_tenant_id       on automation_rules("tenantId");
create index if not exists idx_automation_logs_tenant_id        on automation_logs("tenantId");
create index if not exists idx_audit_logs_tenant_id             on audit_logs("tenantId");

commit;
