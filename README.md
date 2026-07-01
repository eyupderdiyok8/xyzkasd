# Water Purifier Service ERP — Multi-Tenant SaaS

Su arıtma servis firmaları için çok kiracılı (multi-tenant) ERP sistemi.

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) / SQLite (dev) |
| ORM | Prisma |
| Auth | Supabase Auth (JWT + RLS) |
| WhatsApp | WAHA (WhatsApp HTTP API) |
| Language | TypeScript (strict) |
| Test | Vitest |
| Hosting | Vercel |

## Özellikler

| Özellik | Durum |
|---------|-------|
| Multi-tenant izolasyon (tenant_id + RLS + JWT claims) | ✅ |
| Cihaz yönetimi (CRUD, QR kod, fotoğraf, TDS ölçüm) | ✅ |
| Müşteri yönetimi (çoklu telefon/adres, soft delete) | ✅ |
| Servis kaydı (TDS, basınç, kaçak, filtre, imza, PDF rapor) | ✅ |
| Filtre takibi (ömür hesaplama, bakım tarihi) | ✅ |
| Bakım hatırlatma (WhatsApp, 15/7 gün, gecikmiş) | ✅ |
| Memnuniyet anketi (otomatik, kupon, Google Review) | ✅ |
| Kupon/indirim sistemi (kod, yüzde, süre, limit) | ✅ |
| Envanter yönetimi (stok giriş/çıkış, kritik uyarı) | ✅ |
| Mesaj şablonları (tenant bazlı, değişken destekli) | ✅ |
| WhatsApp entegrasyonu (WAHA, QR bağlantı, multi-session) | ✅ |
| Otomasyon motoru (trigger → condition → action) | ✅ |
| Raporlar (dashboard, teknisyen, filtre, tahmin) | ✅ |
| Abonelik/feature flag (Starter / Professional) | ✅ |
| Denetim günlüğü (audit log) | ✅ |
| QR kod halka açık cihaz sayfası | ✅ |
| Soft delete (tüm ana tablolarda) | ✅ |

## Rol Tabanlı Erişim (RBAC)

| Rol | Yetkileri |
|-----|-----------|
| **super_admin** | Tüm tenant'ları görür, tenant oluşturur/siler, plan değiştirir |
| **tenant_admin** | Kendi tenant'ını yönetir, kullanıcı ekler, WhatsApp bağlar |
| **manager** | Servis kaydı oluşturur, teknisyen atar, raporları görür |
| **technician** | Atanan servis çağrılarını görür, tamamlama formu doldurur |
| **viewer** | Sadece gösterge paneli ve müşteri listesini görür |

## Multi-Tenant İzolasyon (3 Katman)

```
1. Middleware Katmanı     → Supabase Auth + RBAC + Plan kontrolü
2. Repository Katmanı     → tenantFilter() ile otomatik sorgu kısıtlama
3. Database Katmanı (RLS) → PostgreSQL RLS (20+ tabloda)
```

Detaylı SDD: [docs/sdd-multi-tenant-isolation.md](docs/sdd-multi-tenant-isolation.md)

## Servis Operasyonları (Service Lifecycle)

```
Servis Kaydı Oluşturma (Manager)
        │
        ▼
Teknisyen Atama (Manager / Otomatik)
        │
        ▼
Servis Tamamlama (Teknisyen)
   ├── TDS Ölçümü (before / after)
   ├── Basınç Ölçümü (before / after)
   ├── Kaçak Kontrolü
   ├── Filtre Değişimi (tracking)
   ├── Fotoğraf Yükleme (Supabase Storage)
   ├── Dijital İmza (Canvas SignaturePad)
   └── PDF Rapor (otomatik oluşturulur)
        │
        ▼
Anket Daveti (Otomatik WhatsApp)
        │
        ▼
Otomasyon Motoru (trigger: service.completed)
```

Detaylı SDD: [docs/sdd-service-operations.md](docs/sdd-service-operations.md)

## Otomasyon Motoru (Trigger → Condition → Action)

Kurallar `service.completed`, `device.registered`, `maintenance.due` gibi trigger'larla çalışır:

```typescript
interface AutomationRule {
  trigger: 'service.completed' | 'device.registered' | 'maintenance.due';
  conditions?: { field: string; operator: 'eq' | 'gt' | 'lt'; value: any }[];
  actions: {
    type: 'send_message' | 'create_ticket' | 'send_survey' | 'notify';
    config: Record<string, any>;
  }[];
}
```

Detay: [src/lib/automation/](src/lib/automation/)

## Quick Start

```bash
# Bağımlılıkları yükle
npm install

# Prisma client oluştur
npx prisma generate

# Development sunucusu
npm run dev

# Testler
npm test

# Type check
npm run typecheck
```

## Environment Variables

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `DATABASE_URL` | PostgreSQL/SQLite bağlantı URI | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Önerilen |
| `WAHA_API_URL` | WAHA Docker container URL | WhatsApp için |
| `WAHA_API_KEY` | WAHA API anahtarı | WhatsApp için |
| `CRON_SECRET` | Vercel Cron güvenlik anahtarı | Production |
| `APP_URL` | Uygulama URL'si (anket linki için) | Production |
| `GOOGLE_REVIEW_URL` | Google Maps review linki | Anket için |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (QR sayfası için) | Production |
| `SUPABASE_SERVICE_KEY` | Supabase service role (alternatif isim) | Önerilen |
| `DATABASE_AUTH_TOKEN` | Turso/LibSQL auth token (opsiyonel) | Turso için |

## Proje Yapısı

```
src/
├── app/
│   ├── (dashboard)/             # Dashboard sayfaları (role-gated)
│   │   ├── admin/               # Tenant admin: WhatsApp, otomasyon, kupon, anket, invite
│   │   ├── customers/           # Müşteri yönetimi (CRUD, çoklu telefon/adres)
│   │   ├── devices/             # Cihaz yönetimi + filtre takibi + QR
│   │   ├── inventory/           # Envanter yönetimi (stok giriş/çıkış/kritik)
│   │   ├── manager/             # Yönetici paneli + servis kaydı oluşturma
│   │   ├── technician/          # Teknisyen: servis tamamlama formu (TDS, imza, fotoğraf)
│   │   └── reports/             # Dashboard, performans, filtre tahmin raporları
│   ├── api/                     # API route handlers
│   │   ├── auth/                # Auth endpoints (login, register, callback)
│   │   ├── automation/          # Otomasyon kuralları CRUD + trigger + log
│   │   ├── coupons/             # Kupon CRUD + validate
│   │   ├── cron/                # Vercel Cron endpoint'leri
│   │   ├── customers/           # Müşteri CRUD
│   │   ├── devices/             # Cihaz CRUD + filtre + fotoğraf + TDS
│   │   ├── inventory/           # Envanter + stok giriş/çıkış
│   │   ├── maintenance/         # Bakım hatırlatmaları + kuyruk
│   │   ├── message-templates/   # Şablon CRUD + render
│   │   ├── public/              # Public endpoints (servis talebi, cihaz sorgulama)
│   │   ├── reports/             # Rapor verileri (aggregate)
│   │   ├── service-tickets/     # Servis kaydı CRUD + tamamlama + PDF rapor + fotoğraf
│   │   ├── survey/              # Anket send/respond/report
│   │   ├── users/               # Kullanıcı yönetimi
│   │   └── whatsapp/            # WhatsApp QR/status/send/webhook
│   ├── auth/                    # Auth callback + logout routes
│   ├── login/                   # Login sayfası
│   ├── public/                  # Public QR cihaz sayfası (halka açık)
│   ├── register/                # Register sayfası (yeni tenant kaydı)
│   └── survey/                  # Anket sayfası (halka açık, ticketId bazlı)
├── components/                  # Paylaşılan bileşenler
│   ├── CustomerForm.tsx         # Müşteri formu (mockup mode)
│   ├── CustomerSelect.tsx       # Müşteri seçici dropdown
│   ├── DashboardStats.tsx       # Dashboard kartları
│   ├── MaintenanceReminders.tsx # Bakım hatırlatma listesi
│   ├── OverdueQueue.tsx         # Gecikmiş servis kuyruğu
│   └── RequireRole.tsx          # Role-based rendering guard
├── lib/
│   ├── automation/              # Otomasyon motoru (engine + types + index)
│   ├── messaging/               # Mesajlaşma soyutlaması (WhatsApp/SMS/Email + template engine)
│   ├── storage/                 # Supabase Storage helpers (device-photos, service-photos, service-report)
│   ├── supabase/                # Supabase client + auth helpers (server/client/admin)
│   ├── whatsapp/                # WAHA session manager + notify helpers
│   ├── audit.service.ts         # Denetim günlüğü servisi
│   ├── env.ts                   # Environment değişken validasyonu
│   ├── features.ts              # Feature flag / plan yönetimi
│   ├── ip.ts                    # IP adresi tespit yardımcısı
│   ├── prisma.ts                # Prisma client singleton
│   └── roles.ts                 # RBAC hiyerarşisi + guard helpers
├── repositories/                # Veri erişim katmanı (tenant izolasyonlu)
│   ├── base.repository.ts       # BaseRepository: tenantFilter + audit helpers
│   ├── customer.repository.ts   # Müşteri CRUD (soft delete, çoklu iletişim)
│   ├── device.repository.ts     # Cihaz CRUD + filtre takibi
│   ├── filter-tracking.repository.ts  # Filtre ömür hesaplama + bakım
│   ├── service-ticket.repository.ts   # Servis kaydı + TDS + imza + PDF
│   ├── maintenance.repository.ts      # Bakım hatırlatma + kuyruk
│   ├── survey.repository.ts           # Anket + kupon + Google Review
│   ├── coupon.repository.ts           # Kupon CRUD + validate
│   ├── inventory.repository.ts        # Stok giriş/çıkış/kritik uyarı
│   ├── automation-rule.repository.ts  # Otomasyon kuralları
│   ├── automation-log.repository.ts   # Otomasyon logları
│   ├── message-template.repository.ts # Mesaj şablonları
│   └── report.repository.ts           # Rapor aggregate sorguları
├── middleware.ts                 # Next.js middleware (auth + RBAC + plan kontrolü)
└── types/                       # Paylaşılan TypeScript tipleri

prisma/
├── schema.prisma                # Veritabanı şeması (25+ model, full relations)
└── migrations/                  # SQL migration dosyaları (RLS, şablon, anket, audit, plan, soft delete)

supabase/
├── migrations/                  # Supabase auth migration'ları (RBAC, JWT claims, RLS, audit)
└── seed.sql                     # Seed verileri

docs/
├── sdd-multi-tenant-isolation.md  # Multi-tenant izolasyon SDD
└── sdd-service-operations.md      # Servis operasyonları SDD
```

## Test Coverage

| Katman | Test Dosyası | Test Sayısı |
|--------|-------------|-------------|
| Repository | 15 dosya | 217 |
| Library | 8 dosya | 61 |
| Middleware | 1 dosya | 17 |
| **Toplam** | **24 dosya** | **295** |

## Planlar

| Plan | Özellikler |
|------|-----------|
| **Starter** | CRM, servis yönetimi, anket, kupon |
| **Professional** | Tüm özellikler (WhatsApp, otomasyon, şablonlar, raporlar) |

## API Route Reference

| Route | Metod | Açıklama | Min Rol |
|-------|-------|----------|---------|
| `/api/auth/register` | POST | Yeni tenant + admin kaydı | public |
| `/api/auth/invite` | POST | Kullanıcı davet et | tenant_admin |
| `/api/customers` | GET/POST | Müşteri listele/ekle | viewer |
| `/api/customers/:id` | GET/PUT/DELETE | Müşteri detay/güncelle/sil | viewer |
| `/api/devices` | GET/POST | Cihaz listele/ekle | technician |
| `/api/devices/:id` | GET/PUT/DELETE | Cihaz detay/güncelle/sil | technician |
| `/api/devices/:id/photos` | POST | Cihaz fotoğrafı yükle | technician |
| `/api/devices/:id/tds` | POST | TDS ölçümü kaydet | technician |
| `/api/filters` | GET | Filtre takip listesi | technician |
| `/api/filters/:id` | PUT | Filtre durumu güncelle | technician |
| `/api/service-tickets` | GET/POST | Servis kaydı listele/oluştur | technician/manager |
| `/api/service-tickets/:id` | GET/PUT | Servis detay/tamamla | technician |
| `/api/service-tickets/:id/photos` | POST | Servis fotoğrafı yükle | technician |
| `/api/service-tickets/:id/report` | GET | PDF raporu indir | technician |
| `/api/maintenance` | GET | Bakım hatırlatmaları | manager |
| `/api/maintenance/queue` | GET | Gecikmiş bakım kuyruğu | manager |
| `/api/inventory` | GET/POST | Envanter listele/stok giriş | technician |
| `/api/inventory/:id` | PUT/DELETE | Stok güncelle/sil | technician |
| `/api/inventory/alerts` | GET | Kritik stok uyarıları | manager |
| `/api/reports/dashboard` | GET | Dashboard istatistikleri | manager |
| `/api/reports/technician` | GET | Teknisyen performans raporu | manager |
| `/api/reports/filters` | GET | Filtre değişim tahmin raporu | manager |
| `/api/survey` | POST | Anket gönder | manager |
| `/api/survey/respond` | POST | Anket yanıtla | public |
| `/api/coupons` | GET/POST | Kupon listele/oluştur | tenant_admin |
| `/api/coupons/:code/validate` | POST | Kupon doğrula | public |
| `/api/automation/rules` | GET/POST | Otomasyon kuralları | manager |
| `/api/automation/logs` | GET | Otomasyon logları | manager |
| `/api/message-templates` | GET/POST | Mesaj şablonları | tenant_admin |
| `/api/whatsapp/status` | GET | WhatsApp bağlantı durumu | tenant_admin |
| `/api/whatsapp/qr` | POST | QR bağlantı başlat | tenant_admin |
| `/api/whatsapp/send` | POST | WhatsApp mesajı gönder | manager |
| `/api/whatsapp/webhook` | POST | WAHA webhook handler | internal |
| `/api/users` | GET | Kullanıcı listesi | tenant_admin |
| `/api/cron/maintenance-check` | POST | Bakım kontrol cron (Vercel) | cron |
| `/api/public/devices/:serialNo` | GET | Public cihaz sorgulama | public |
| `/api/public/service-request` | POST | Public servis talebi | public |
