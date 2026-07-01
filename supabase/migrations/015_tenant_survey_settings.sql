-- 015_tenant_survey_settings.sql
-- Tenant bazında Google Review linki ve özel anket mesajı

alter table tenants
  add column if not exists google_review_url text,
  add column if not exists survey_message text;

comment on column tenants.google_review_url is 'Firma Google Review linki';
comment on column tenants.survey_message is 'Özel anket davet mesajı (boşsa default kullanılır)';
