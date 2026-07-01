-- 016_system_settings.sql
-- Super admin tarafindan yonetilebilen key-value ayarlar

create table if not exists system_settings (
  key        text primary key,
  value      text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Default anket mesaji
insert into system_settings (key, value) values (
  'default_survey_message',
  'Sayın {{customer_name}}, servis işleminiz başarıyla tamamlandı. Sizden ricamız, {{company_name}} olarak verdiğimiz hizmeti değerlendirmenizdir. Aşağıdaki linke tıklayarak memnuniyet anketimize katılabilirsiniz (1-5 puan):

{{survey_url}}

Görüşleriniz bizim için değerli!'
) on conflict (key) do nothing;
