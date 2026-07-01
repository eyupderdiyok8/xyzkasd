# SDD: Service Operations — Water Purifier Service ERP

**Status:** Implemented ✅  
**Priority:** High  
**Type:** Feature  
**Last Updated:** 2026-06-29  

---

## 1. Overview

Bu doküman, Water Purifier Service ERP sisteminde **servis operasyonları**nın (servis kaydı oluşturma, tamamlama, filtre takibi, fotoğraf/imza, PDF rapor, anket ve otomasyon) nasıl çalıştığını tanımlar.

### 1.1 Terminology

| Terim | Açıklama |
|-------|----------|
| **Service Ticket** | Bir müşteri/cihaz için açılan servis çağrısı |
| **TDS** | Total Dissolved Solids — su kalite ölçümü (ppm) |
| **Filter Tracking** | Filtre değişim takibi ve ömür hesaplama |
| **Signature** | Dijital imza (Canvas üzerinden alınır) |
| **Service Report** | PDF formatında servis tamamlama raporu |
| **Survey** | Servis sonrası memnuniyet anketi |

### 1.2 Acceptance Criteria

- [x] Manager, müşteri + cihaz seçerek servis kaydı oluşturabilir
- [x] Teknisyen, kendine atanan servis kayıtlarını görebilir
- [x] Teknisyen, tamamlama formunda TDS/basınç/kaçak/filtre/imza/fotoğraf girebilir
- [x] Tamamlama sonrası otomatik PDF rapor oluşur
- [x] PDF rapor Supabase Storage'a kaydedilir
- [x] Tamamlama sonrası otomatik anket daveti gönderilir (WhatsApp)
- [x] Filtre değişimleri kaydedilir ve ömür hesaplaması yapılır
- [x] Servis tamamlandığında otomasyon motoru tetiklenir
- [x] Servis fotoğrafları Supabase Storage'a yüklenir (signed URL)

---

## 2. Service Ticket Data Model

### 2.1 ServiceTicket (Prisma)

```prisma
model ServiceTicket {
  id              String   @id @default(cuid())
  ticketNo        String   @unique  // otomatik: SRV-20240629-001
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  deviceId        String
  device          Device   @relation(fields: [deviceId], references: [id])
  technicianId    String?
  technician      User?    @relation(fields: [technicianId], references: [id])
  status          TicketStatus  @default(PENDING)
  priority        Priority @default(NORMAL)
  issueDesc       String
  scheduledAt     DateTime?
  completedAt     DateTime?

  // Completion fields (filled by technician)
  tdsBefore           Int?
  tdsAfter            Int?
  pressureBefore      Int?
  pressureAfter       Int?
  leakCheck           Boolean?
  leakNotes           String?
  workDone            String?
  customerNote        String?
  resolution          String?
  signatureDataUrl    String?   // Data URL from Canvas
  signatureName       String?   // İmza atan kişi adı
  pdfStoragePath      String?   // Supabase Storage path

  // Relations
  technicianNotes TechnicianNote[]
  filterChanges   FilterChange[]
  photos          ServicePhoto[]

  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  createdBy   String?
  updatedBy   String?

  @@index([tenantId])
  @@index([customerId])
  @@index([deviceId])
  @@index([technicianId])
  @@index([status])
}

enum TicketStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 2.2 FilterChange

```prisma
model FilterChange {
  id             String  @id @default(cuid())
  ticketId       String
  ticket         ServiceTicket @relation(fields: [ticketId], references: [id])
  filterId       String
  filter         Filter  @relation(fields: [filterId], references: [id])
  quantity       Int     @default(1)
  notes          String?
  replacedAt     DateTime @default(now())
}
```

### 2.3 ServicePhoto

```prisma
model ServicePhoto {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    ServiceTicket @relation(fields: [ticketId], references: [id])
  storagePath String
  publicUrl String?
  caption   String?
  createdAt DateTime @default(now())
}
```

### 2.4 DeviceFilterTracking

```prisma
model DeviceFilterTracking {
  id             String   @id @default(cuid())
  deviceId       String
  device         Device   @relation(fields: [deviceId], references: [id])
  filterId       String
  filter         Filter   @relation(fields: [filterId], references: [id])
  installedAt    DateTime @default(now())
  replacedAt     DateTime?  // null = currently installed
  lifespanDays   Int      @default(180)  // öngörülen ömür (gün)
  notes          String?
}
```

---

## 3. Service Lifecycle: Step by Step

### 3.1 Service Ticket Creation (Manager)

```
Role: manager (veya üstü)
Endpoint: POST /api/service-tickets
```

**Request:**
```json
{
  "customerId": "cm8abc123",
  "deviceId": "cm8def456",
  "technicianId": "cm8ghi789",
  "issueDesc": "Su basıncı düşük, filtre değişimi gerekli",
  "scheduledAt": "2026-07-01T09:00:00Z"
}
```

**Validation:**
- `customerId` — zorunlu, tenant'a ait müşteri olmalı
- `deviceId` — zorunlu, tenant'a ait cihaz olmalı
- `issueDesc` — zorunlu, min 10 karakter
- `technicianId` — opsiyonel, tenant içinde teknisyen rolünde kullanıcı

**Response (201):**
```json
{
  "data": {
    "id": "tkt_cm8xxx",
    "ticketNo": "SRV-20240629-001",
    "status": "PENDING",
    "customerId": "cm8abc123",
    "deviceId": "cm8def456",
    "technicianId": "cm8ghi789",
    "issueDesc": "Su basıncı düşük, filtre değişimi gerekli",
    "scheduledAt": "2026-07-01T09:00:00Z"
  }
}
```

**Frontend:** `/manager/services/new` → CustomerSelect + DeviceSelect + form

### 3.2 Service Listing

```
Role: technician veya üstü
Endpoint: GET /api/service-tickets?status=PENDING&technicianId=...
```

- technician rolü: sadece kendine atanan kayıtları görür
- manager+: tüm kayıtları görür, `technicianId` ile filtreleyebilir
- `status`, `search` (ticketNo, müşteri adı), `showDeleted` parametreleri

### 3.3 Service Completion (Technician)

```
Role: technician veya üstü
Endpoint: PUT /api/service-tickets/:id
Body (completion):
```

```json
{
  "tdsBefore": 450,
  "tdsAfter": 120,
  "pressureBefore": 3,
  "pressureAfter": 5,
  "leakCheck": false,
  "leakNotes": null,
  "workDone": "Sediment filtre + karbon blok değişimi, membran temizliği",
  "customerNote": "Müşteri memnun, 6 ay sonra bakım önerildi",
  "signatureDataUrl": "data:image/png;base64,iVBOR...",
  "signatureName": "Ahmet Yılmaz",
  "resolution": "Filtreler değiştirildi, basınç normale döndü",
  "filterChanges": [
    { "filterId": "flt_001", "quantity": 1, "notes": "Sediment 5 mikron" }
  ]
}
```

**What happens on completion:**

```
PUT /api/service-tickets/:id
        │
        ▼
[1] Repo.completeService()
    ├── Status → COMPLETED
    ├── completedAt → now()
    ├── TDS / basınç / kaçak kaydedilir
    ├── İmza (data URL) kaydedilir
    └── Filtre değişimleri işlenir (FilterChange oluştur, DeviceFilterTracking güncelle)
        │
        ▼
[2] PDF Rapor (autoGeneratePdf — fire & forget)
    ├── PDFKit ile HTML olmayan native PDF
    ├── PDF → Buffer → Supabase Storage
    ├── ticket.pdfStoragePath güncellenir
    └── Hata durumunda sessizce başarısız olur (bloklamaz)
        │
        ▼
[3] Anket Daveti (autoSendSurvey — fire & forget)
    ├── SurveyRepository.sendSurvey(ticketId)
    ├── WhatsApp mesajı: anket linki
    └── Hata durumunda sessizce başarısız olur
        │
        ▼
[4] Otomasyon Motoru (fire trigger — fire & forget)
    ├── trigger: "service.completed"
    ├── tenantId, entityType: "service_ticket", entityId
    ├── Kural eşleşirse action'lar çalıştırılır
    └── Hata durumunda sessizce başarısız olur
```

**Auto-completion rules:**
- Tüm adımlar fire-and-forget (non-blocking) — kullanıcıya hemen yanıt döner
- Her adım try/catch içinde — biri başarısız olursa diğerleri etkilenmez

### 3.4 Service Photos

```
POST /api/service-tickets/:id/photos
Body: FormData (file)
```

- Fotoğraflar `{tenantId}/service-photos/{ticketId}/` path'ine yüklenir
- Supabase Storage signed URL ile erişilir
- Her fotoğraf `ServicePhoto` tablosuna kaydedilir

---

## 4. Filter Tracking System

### 4.1 Filter Değişim Akışı

```
Servis Tamamlama
        │
        ▼
FilterChange kaydı oluşturulur
  ├── filterId, quantity, notes
  ├── ticketId ile ilişkilendirilir
        │
        ▼
DeviceFilterTracking güncellenir
  ├── Eski filtre → replacedAt = now()
  ├── Yeni filtre → yeni DeviceFilterTracking satırı, installedAt = now()
  └── lifespanDays = 180 (varsayılan, filter tipine göre değişebilir)
```

### 4.2 Filtre Ömür Hesaplama

```typescript
interface FilterLifespan {
  sediment: 180;    // 6 ay
  carbonBlock: 180; // 6 ay
  membrane: 365;    // 12 ay (RO membran)
  postCarbon: 180;  // 6 ay
  uvLamp: 365;      // 12 ay
  mineral: 180;     // 6 ay
}
```

- Filtre ömrü `installedAt + lifespanDays` ile hesaplanır
- Ömrü dolan filtreler maintenance reminder'da gösterilir
- Filtre tahmin raporu: ne zaman hangi filtre değişecek

### 4.3 Bakım Hatırlatma

```typescript
// C: maintenance-check, Vercel Cron
GET /api/cron/maintenance-check

1. Ömrü 15 gün kalan filtreleri bul
2. Her cihazın müşterisine WhatsApp bildirimi gönder
3. Gecikmiş (ömür > 0) filtreler için manager uyarısı
```

---

## 5. PDF Service Report

### 5.1 PDF Generation

PDF, **PDFKit** kullanılarak oluşturulur — HTML-to-PDF yerine native canvas-based PDF.

**Report Contents:**

```
┌─────────────────────────────────┐
│  SERVİS TAMAMLAMA RAPORU        │
│  [Firma Adı, Telefon, Adres]    │
├─────────────────────────────────┤
│  Rapor No: SRV-20240629-001     │
│  Tarih: 29.06.2026              │
├─────────────────────────────────┤
│  MÜŞTERİ BİLGİLERİ             │
│  • Ad: Ahmet Yılmaz             │
│  • Tel: 0532 XXX XX XX          │
│  • Adres: Kadıköy/İstanbul      │
├─────────────────────────────────┤
│  CİHAZ BİLGİLERİ                │
│  • Marka/Model: ABC RO-100      │
│  • Seri No: ABC123456           │
├─────────────────────────────────┤
│  SERVİS DETAYLARI               │
│  • Teknisyen: Mehmet Kaya       │
│  • Arıza: Su basıncı düşük      │
│  • Yapılan: Filtre değişimi     │
├─────────────────────────────────┤
│  ÖLÇÜMLER                       │
│  • TDS Giriş: 450 ppm           │
│  • TDS Çıkış: 120 ppm           │
│  • Basınç Giriş: 3 bar          │
│  • Basınç Çıkış: 5 bar          │
│  • Kaçak Kontrolü: Yok          │
├─────────────────────────────────┤
│  DEĞİŞEN FİLTRELER              │
│  • Sediment 5µ (1 adet)         │
│  • Karbon Blok (1 adet)         │
├─────────────────────────────────┤
│  MÜŞTERİ NOTU                   │
│  "Müşteri memnun"               │
│                                 │
│  ┌─────────────────────────┐    │
│  │     [İMZA]              │    │
│  └─────────────────────────┘    │
│  İmza: Ahmet Yılmaz             │
└─────────────────────────────────┘
```

### 5.2 Storage & Retrieval

```typescript
// Generation
const pdfBuffer = await generateServiceReport(reportData);
const { publicUrl, storagePath } = await saveReportToStorage(
  tenantId, ticketNo, pdfBuffer
);
await repo.updatePdfStoragePath(ticketId, storagePath);

// Retrieval
GET /api/service-tickets/:id/report
→ Supabase Storage signed URL (60 dk geçerli)
→ Direkt PDF stream
```

---

## 6. Survey & Coupon Integration

### 6.1 Anket Akışı

```
Servis tamamlandı
        │
        ▼
SurveyRepository.sendSurvey(ticketId)
  ├── SurveyInvitation kaydı oluştur
  └── Müşteri telefonu var mı kontrol et
        │
        ▼
WhatsApp mesajı gönder
  ├── "Merhaba [müşteri], [firma] olarak servis hizmetimizden
  │     memnun kaldınız mı? Aşağıdaki linkten 30 saniyede
  │     anketimizi doldurun ve kupon kazanın!"
  └── Link: {APP_URL}/survey/{ticketId}
        │
        ▼
Müşteri anketi yanıtlar
  ├── 1-5 yıldız
  ├── Memnuniyet puanı
  └── İsteğe bağlı yorum
        │
        ▼
5 yıldız ✓              → Google Review linki + kupon
4 yıldız                → Teşekkür mesajı + kupon  
1-3 yıldız              → Manager bildirimi (WhatsApp)
```

### 6.2 Coupon Generation

```typescript
// Otomatik kupon oluşturma (anket 4+ yıldız ise)
const coupon = await couponRepo.create({
  tenantId,
  code: `SRV-${ticketNo.slice(-4)}-${Date.now().toString(36).toUpperCase()}`,
  discountType: 'PERCENTAGE',
  discountValue: 10,
  maxUses: 1,
  expiresAt: addMonths(new Date(), 3),
  description: 'Anket teşekkür indirimi',
});
```

---

## 7. Automation Engine Integration

Servis tamamlandığında otomasyon motoru `service.completed` trigger'ı ile tetiklenir:

### 7.1 Trigger Payload

```typescript
{
  trigger: 'service.completed',
  timestamp: '2026-06-29T14:30:00Z',
  tenantId: 'tnt_abc123',
  entityType: 'service_ticket',
  entityId: 'tkt_cm8xxx',
  data: {
    ticketId: 'tkt_cm8xxx',
    ticketNo: 'SRV-20240629-001',
    customerId: 'cm8abc123',
    customerName: 'Ahmet Yılmaz',
    customerPhone: '+905321234567',
    deviceId: 'cm8def456',
    deviceModel: 'RO-100',
    deviceBrand: 'ABC',
    deviceSerial: 'ABC123456',
    technicianId: 'usr_xyz',
    technicianName: 'Mehmet Kaya',
    completedAt: '2026-06-29T14:30:00Z',
    status: 'COMPLETED',
  }
}
```

### 7.2 Örnek Otomasyon Kuralları

| Kural | Trigger | Condition | Action |
|-------|---------|-----------|--------|
| Hoş geldin mesajı | `device.registered` | — | `send_message` (WhatsApp) |
| 6 ay bakım hatırlatma | `maintenance.due` | filter age > 160g | `send_message` + `create_ticket` |
| Düşük puan uyarısı | `survey.completed` | rating < 4 | `notify` (manager WhatsApp) |
| Otomatik anket | `service.completed` | — | `send_survey` |

---

## 8. Frontend Pages

### 8.1 Page Map

| Page | Route | Rol | Açıklama |
|------|-------|-----|----------|
| Yeni Servis Kaydı | `/manager/services/new` | manager+ | Müşteri + cihaz seç, teknisyen ata |
| Servis Kayıtları | `/manager/services` | manager+ | Tüm kayıtları listele, filtrele |
| Servis Çağrıları | `/technician` | technician | Atanan çağrıları listele |
| Servis Tamamlama | `/technician/[id]` | technician | TDS, basınç, kaçak, filtre, imza, fotoğraf formu |
| Filtre Takibi | `/devices/filters` | technician+ | Cihaz bazlı filtre durumu |

### 8.2 Service Completion Form (Technician)

```
┌─────────────────────────────────┐
│  SERVİS TAMAMLAMA               │
│  ┌───────┐ ┌───────┐            │
│  │TDS    │ │TDS    │            │
│  │GİRİŞ  │ │ÇIKIŞ  │            │
│  │ [450] │ │ [120] │            │
│  └───────┘ └───────┘            │
│  ┌───────┐ ┌───────┐            │
│  │BASINÇ │ │BASINÇ │            │
│  │GİRİŞ  │ │ÇIKIŞ  │            │
│  │  [3]  │ │  [5]  │            │
│  └───────┘ └───────┘            │
│                                  │
│  Kaçak: [❌ Yok] [ Var ]       │
│  Kaçak Notu: ___________        │
│                                  │
│  Yapılan İş:                     │
│  ┌─────────────────────────┐    │
│  │ Filtre değişimi...      │    │
│  └─────────────────────────┘    │
│                                  │
│  Değişen Filtreler:             │
│  ┌─────────────────────────┐    │
│  │ [+] Sediment 5µ   x1   │    │
│  │ [+] Karbon Blok  x1   │    │
│  └─────────────────────────┘    │
│                                  │
│  Müşteri Notu:                   │
│  ┌─────────────────────────┐    │
│  │ Memnun, 6 ay sonra...   │    │
│  └─────────────────────────┘    │
│                                  │
│  ┌─────────────────────────┐    │
│  │     [İMZA PANELİ]       │    │
│  │   (Canvas — mouse/touch)│    │
│  │  İmza Eden: [Ad Soyad] │    │
│  └─────────────────────────┘    │
│                                  │
│  [📷 Fotoğraf Ekle]            │
│                                  │
│  ┌──────────────────────┐       │
│  │   SERVİSİ TAMAMLA    │       │
│  └──────────────────────┘       │
└─────────────────────────────────┘
```

---

## 9. Key Implementation Details

### 9.1 TDS & Pressure Validation

```typescript
// TDS değerleri 0-9999 ppm arasında olmalı
function validateTDS(value: number): boolean {
  return value >= 0 && value <= 9999;
}

// Basınç 1-10 bar arasında olmalı
function validatePressure(value: number): boolean {
  return value >= 1 && value <= 10;
}
```

### 9.2 Signature Processing

```typescript
// Signature from Canvas
// Data URL format: "data:image/png;base64,iVBOR..."
// Canvas boyutu: 400x200px
// SignaturePad kütüphanesi (canvas-based)

// Storage: signature data URL'i doğrudan DB'de saklanır
// PDF: base64 decode edilip PDFKit image olarak eklenir
```

### 9.3 Ticket Number Generation

```typescript
function generateTicketNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sequence = getNextDailySequence(date); // Redis / DB counter
  return `SRV-${date}-${String(sequence).padStart(3, '0')}`;
}
// Örnek: SRV-20240629-001
```

### 9.4 PDF Storage Path

```typescript
// Supabase Storage path structure:
// {tenantId}/service-reports/{ticketNo}.pdf
// Example: tnt_abc123/service-reports/SRV-20240629-001.pdf

// publicUrl: Supabase signed URL (60 dk geçerli)
```

---

## 10. API Reference

### 10.1 Service Tickets

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|-------------|----------|
| `GET` | `/api/service-tickets` | technician+ | `?status=PENDING&technicianId=...` | `{ data: ServiceTicket[] }` |
| `POST` | `/api/service-tickets` | manager+ | `{ customerId, deviceId, issueDesc, technicianId?, scheduledAt? }` | `{ data: ServiceTicket }` (201) |
| `GET` | `/api/service-tickets/:id` | technician+ | — | `{ data: ServiceTicket }` |
| `PUT` | `/api/service-tickets/:id` | technician+ | `{ tdsBefore?, tdsAfter?, pressureBefore?, pressureAfter?, leakCheck?, workDone?, signatureDataUrl?, signatureName?, filterChanges?, ... }` | `{ data: ServiceTicket }` |
| `POST` | `/api/service-tickets/:id/photos` | technician+ | FormData (file) | `{ data: ServicePhoto }` |
| `GET` | `/api/service-tickets/:id/report` | technician+ | — | PDF stream / redirect to signed URL |

### 10.2 Filter Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/filters` | technician+ | Filtre listesi + durum |
| `PUT` | `/api/filters/:id` | technician+ | Filtre bilgisi güncelle |
| `GET` | `/api/devices/:id/filters` | technician+ | Cihaza ait filtre takip durumu |

### 10.3 Survey

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/survey` | manager+ | Anket daveti gönder |
| `POST` | `/api/survey/respond` | public | Anket yanıtla |
| `GET` | `/api/survey/report` | manager+ | Anket istatistikleri |

---

## 11. Error Codes

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Eksik/geçersiz alan (customerId, tdsBefore out of range) |
| `UNAUTHORIZED` | 401 | Token yok/geçersiz |
| `FORBIDDEN` | 403 | Yanlış rol (technician complete'a çalışıyor) |
| `NOT_FOUND` | 404 | Ticket/customer/device bulunamadı |
| `INVALID_STATUS` | 400 | Zaten COMPLETED olan ticket tekrar tamamlanmaya çalışılıyor |
| `TENANT_MISMATCH` | 404 | Farklı tenant kaynağına erişim |
| `INTERNAL_ERROR` | 500 | Beklenmeyen hata |

---

## 12. Testing Strategy

| Test | Dosya | Coverage |
|------|-------|----------|
| Service ticket CRUD | `repositories/__tests__/service-ticket.repository.test.ts` | Create, findAll, findById, status transitions |
| Service completion | `repositories/__tests__/service-ticket-completion.test.ts` | TDS, basınç, kaçak, filtre, imza, PDF path |
| Filter tracking | `repositories/__tests__/filter-tracking.repository.test.ts` | Değişim kaydı, ömür, bakım tarihi |
| Service photos | `lib/storage/__tests__/` | Upload, signed URL, delete |
| Multi-tenant isolation | `repositories/__tests__/multi-tenant-isolation.test.ts` | Cross-tenant erişim engeli |
| Multi-tenant service | `repositories/__tests__/multi-tenant-isolation.test.ts` | Service ticket cross-tenant |
| Automation triggers | `lib/automation/__tests__/` | Trigger → condition → action |

---

## 13. Related SDDs

| SDD | İlişki |
|-----|--------|
| Multi-Tenant Isolation | Tenant bazlı veri izolasyonu ✅ |
| Device Management | Cihaz CRUD + QR + TDS ✅ |
| Filter Tracking | Filtre ömür + bakım ✅ |
| Maintenance Reminders | Cron + WhatsApp hatırlatma ✅ |
| Survey System | Anket + kupon + Google Review ✅ |
| Automation Engine | Trigger → Condition → Action ✅ |
| WhatsApp Integration | WAHA multi-session ✅ |
| Coupon System | Kupon oluşturma + doğrulama ✅ |
