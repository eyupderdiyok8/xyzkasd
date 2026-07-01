# SDD: Multi-Tenant Isolation — Water Purifier Service ERP

**Status:** Implemented ✅  
**Priority:** Critical  
**Type:** Security  
**Last Updated:** 2026-06-29  

---

## 1. Overview

Bu doküman, Water Purifier Service ERP sisteminde **multi-tenant izolasyonu**nun nasıl uygulanacağını tanımlar. Her tenant (firma) kendi verilerini görür, diğer tenant'ların verilerine erişemez.

### 1.1 Terminology

| Terim | Açıklama |
|-------|----------|
| **Tenant** | Sisteme kayıtlı bağımsız bir firma (su arıtma servisi) |
| **Tenant Admin** | Firma içi yönetici, tenant kullanıcılarını yönetir |
| **Tenant User** | Firmaya bağlı çalışan (teknisyen, operatör) |
| **Super Admin** | Tüm tenant'ları gören sistem yöneticisi |
| **RLS** | Row-Level Security — satır düzeyinde güvenlik |

### 1.2 Acceptance Criteria

- [x] Kullanıcı sadece kendi tenant'ının verilerini görebilir
- [x] Farklı tenant verilerine direkt API erişimi 404/403 döndürür
- [x] JWT'de tenant_id ve role claim'leri bulunur
- [x] Yeni tenant oluşturma sadece Super Admin tarafından yapılabilir
- [x] Kullanıcı tenant değiştiremez (Super Admin hariç)
- [x] RLS politikaları veritabanı seviyesinde çalışır
- [x] Tüm tablolarda tenant_id alanı bulunur (cross-tenant tablolar hariç)
- [x] API middleware tüm isteklerde tenant context'i doğrular

---

## 2. Database Schema

### 2.1 Tenant Table

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  phone       String?
  email       String?
  address     String?
  isActive    Boolean  @default(true)
  maxUsers    Int      @default(10)
  maxDevices  Int      @default(100)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  devices     Device[]
  technicians Technician[]
  // ... other tenant-scoped relations
}
```

### 2.2 All Tenant-Scoped Tables Include `tenant_id`

Her tenant'a ait tablo, `tenant_id` alanını içerir ve `Tenant` modeline foreign key ile bağlanır:

```prisma
model User {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  email     String   @unique
  role      UserRole @default(TENANT_USER)
  // ...

  @@index([tenantId])
}
```

### 2.3 Cross-Tenant (Global) Tables

Sadece sistem geneli tablolar `tenant_id` içermez:

```prisma
// Global — Super Admin tarafından yönetilir
model Tenant {
  // ...
}

model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String?  // null olabilir — sistem logları
  userId    String?
  action    String
  // ...
}
```

### 2.4 Enum: UserRole

```prisma
enum UserRole {
  SUPER_ADMIN    // Tüm tenant'ları görebilir
  TENANT_ADMIN   // Kendi tenant'ını yönetir
  TENANT_USER    // Kendi tenant'ında sınırlı erişim
}
```

---

## 3. Authentication & JWT

### 3.1 JWT Token Yapısı

```typescript
interface JwtPayload {
  sub: string;           // user_id
  tenant_id: string;     // tenant_id (SUPER_ADMIN için null olabilir)
  role: UserRole;        // kullanıcı rolü
  email: string;         // kullanıcı email
  iat: number;
  exp: number;
}
```

### 3.2 Token Üretimi (Login)

```typescript
// Login sonrası token oluşturma
function generateToken(user: User, tenant: Tenant): string {
  return jwt.sign(
    {
      sub: user.id,
      tenant_id: tenant.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}
```

### 3.3 Token Validation Middleware

```typescript
// Express/Fastify middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token required' } });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.sub,
      tenantId: payload.tenant_id,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}
```

---

## 4. Tenant Context Middleware

JWT'den tenant context'i çıkarır ve istek boyunca taşır:

```typescript
// Tenant context'i request boyunca taşı
declare global {
  namespace Express {
    interface Request {
      tenantContext: {
        tenantId: string | null;  // SUPER_ADMIN için null
        userId: string;
        role: UserRole;
      };
    }
  }
}

// Tenant context middleware
function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const { tenant_id, sub, role } = req.user;

  req.tenantContext = {
    tenantId: tenant_id,
    userId: sub,
    role: role as UserRole,
  };

  next();
}
```

### 4.1 Tenant Check Helper

```typescript
/**
 * İstek yapılan kaynağın tenant_id'si ile kullanıcının tenant_id'sini karşılaştırır.
 * SUPER_ADMIN tüm tenant'lara erişebilir.
 * Eşleşmezse 403 döndürür.
 */
function assertTenantAccess(resourceTenantId: string, context: TenantContext): void {
  if (context.role === UserRole.SUPER_ADMIN) return; // Super Admin her şeye erişir
  if (context.tenantId !== resourceTenantId) {
    throw new ForbiddenError('Bu kaynağa erişim yetkiniz yok');
  }
}
```

---

## 5. Row-Level Security (PostgreSQL RLS)

PostgreSQL RLS, veritabanı seviyesinde ek bir güvenlik katmanı sağlar. Uygulama katmanı atlansa bile veri sızıntısını engeller.

### 5.1 RLS Migration

```sql
-- Tenant tablosu için RLS
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi tenant'larını görebilir
CREATE POLICY tenant_isolation ON "Tenant"
  FOR ALL
  USING (id = current_setting('app.current_tenant_id')::text);

-- User tablosu için RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_tenant_isolation ON "User"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::text);
```

### 5.2 Session Context (app.current_tenant_id)

```typescript
// Her istekte PostgreSQL session context'ini ayarla
async function setTenantSessionContext(tenantId: string | null): Promise<void> {
  if (tenantId) {
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      tenantId
    );
  } else {
    // SUPER_ADMIN için tüm tenant'lar görünür
    await prisma.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', '', true)`
    );
  }
}
```

### 5.3 RLS Implementation Notes

| Adım | Açıklama |
|------|----------|
| 1 | PostgreSQL'de RLS aktifleştirilir (`ENABLE ROW LEVEL SECURITY`) |
| 2 | Her tablo için `USING` policy oluşturulur |
| 3 | Her API isteğinde `set_config('app.current_tenant_id', ...)` çağrılır |
| 4 | SUPER_ADMIN için current_tenant_id boş string yapılır (tüm veriler görünür) |
| 5 | RLS politikaları, policy'de `current_setting` boşsa tüm satırları gösterir |

---

## 6. Repository Pattern with Tenant Filtering

```typescript
abstract class BaseRepository<T> {
  protected prisma: PrismaClient;
  protected tenantId: string | null;
  protected role: UserRole;

  constructor(tenantContext: TenantContext) {
    this.prisma = prismaClient;
    this.tenantId = tenantContext.tenantId;
    this.role = tenantContext.role;
  }

  /**
   * Tüm sorgulara tenant_id filter'ı ekler.
   * SUPER_ADMIN tenant_id filtresiz sorgulayabilir.
   */
  protected tenantFilter(): { tenantId?: string } {
    if (this.role === UserRole.SUPER_ADMIN) return {};
    return { tenantId: this.tenantId! };
  }
}

// Kullanım:
class DeviceRepository extends BaseRepository<Device> {
  async findAll(): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: {
        ...this.tenantFilter(),
        // diğer filtreler...
      }
    });
  }

  async findById(id: string): Promise<Device | null> {
    const device = await this.prisma.device.findFirst({
      where: {
        id,
        ...this.tenantFilter(),
      }
    });

    // Farklı tenant'a ait kaynak → 404 (varlığını gizle)
    if (!device && this.role !== UserRole.SUPER_ADMIN) {
      throw new NotFoundError('Cihaz bulunamadı');
    }

    return device;
  }
}
```

---

## 7. Error Handling Strategy

| Durum | HTTP Code | Hata Kodu | Açıklama |
|-------|-----------|-----------|----------|
| Token yok | 401 | `UNAUTHORIZED` | Authorization header eksik |
| Token geçersiz/süresi dolmuş | 401 | `UNAUTHORIZED` | JWT doğrulama başarısız |
| Farklı tenant kaynağına erişim | 404 | `NOT_FOUND` | Kaynak varlığını gizle (güvenlik) |
| SUPER_ADMIN olmayan tenant oluşturma | 403 | `FORBIDDEN` | Yetki yok |
| Tenant pasif | 403 | `TENANT_INACTIVE` | Tenant hesabı askıda |

**Güvenlik prensibi:** Farklı tenant'a ait kaynak sorgusunda **404** döndürülür, 403 değil. Böylece kaynağın var olup olmadığı gizlenir.

---

## 8. API Route Design

```typescript
// === Tenant İşlemleri (sadece SUPER_ADMIN) ===
// POST /api/v1/tenants          → Yeni tenant oluştur
// GET  /api/v1/tenants          → Tüm tenant'ları listele
// GET  /api/v1/tenants/:id      → Tenant detayı
// PUT  /api/v1/tenants/:id      → Tenant güncelle (aktif/pasif)
// DELETE /api/v1/tenants/:id    → Tenant sil (soft delete)

// === Tenant Kullanıcıları (TENANT_ADMIN veya SUPER_ADMIN) ===
// GET  /api/v1/tenants/:id/users    → Tenant kullanıcılarını listele
// POST /api/v1/tenants/:id/users    → Yeni kullanıcı ekle
// PUT  /api/v1/tenants/:id/users/:userId → Kullanıcı güncelle
// DELETE /api/v1/tenants/:id/users/:userId → Kullanıcı sil

// === Tenant-Scoped Kaynaklar (otomatik tenant filtering) ===
// GET    /api/v1/devices          → Kendi tenant cihazlarını listele
// POST   /api/v1/devices          → Yeni cihaz ekle
// GET    /api/v1/devices/:id      → Cihaz detayı (tenant kontrollü)
// PUT    /api/v1/devices/:id      → Cihaz güncelle
// DELETE /api/v1/devices/:id      → Cihaz sil

// === Tenant Routing ===
// GET  /api/v1/tenants/:slug/devices → Belirtilen tenant'ın cihazları (sadece SUPER_ADMIN)
```

---

## 9. Middleware Pipeline

```
İstek Girişi
    │
    ▼
[1] authMiddleware
    - Bearer token extraction
    - JWT verification
    - req.user ata (userId, tenantId, role)
    │
    ▼
[2] tenantContextMiddleware
    - req.tenantContext oluştur
    - PostgreSQL session context'i ayarla (RLS için)
    │
    ▼
[3] tenantGuard(requiredRoles?)
    - SUPER_ADMIN ise geç
    - Tenant aktif mi kontrol et
    - Gerekli role sahip mi kontrol et
    │
    ▼
[4] Route Handler
    - Repository üzerinden veri erişimi
    - Otomatik tenant filtering
```

---

## 10. Implementation Plan — COMPLETED ✅

### Phase 1: Foundation ✅
1. ~~Prisma schema: Tenant, User modelleri + UserRole enum~~ → Tamam
2. ~~JWT utility: generateToken, verifyToken~~ → Supabase Auth + JWT custom claims migration
3. ~~authMiddleware: token doğrulama~~ → src/middleware.ts + requireRole()

### Phase 2: Tenant Context ✅
4. ~~tenantContextMiddleware~~ → requireRole() + RepositoryContext
5. ~~tenantGuard middleware (role bazlı erişim)~~ → ROLE_HIERARCHY + ROUTE_GUARDS
6. ~~BaseRepository: tenantFilter yardımcısı~~ → base.repository.ts
7. ~~PostgreSQL RLS migration + politikalar~~ → prisma/migrations/001_rls_policies.sql (20+ tablo)

### Phase 3: API Layer ✅
8. ~~Tenant CRUD routes (sadece SUPER_ADMIN)~~ → Admin paneli
9. ~~Mevcut route'lara tenant filtering ekle~~ → Tüm repository'ler
10. ~~Error handling (404 vs 403 stratejisi)~~ → Cross-tenant → NOT_FOUND

### Phase 4: Testing & Audit ✅
11. ~~Unit tests: middleware, repository~~ → 34 multi-tenant-isolation testi
12. ~~Integration tests: cross-tenant erişim testleri~~ → Repository testleri
13. ~~Security audit: RLS politikaları gözden geçirme~~ → 20+ tablo RLS korumalı
14. ~~Rate limiting + brute-force koruması~~ → Plan bazlı feature gating

---

## 11. Key Security Considerations

1. **Defense in Depth**: Uygulama katmanı (middleware) + Repository (tenantFilter) + Veritabanı (RLS) — üç katmanlı güvenlik
2. **Kaynak Varlığını Gizleme**: Farklı tenant kaynağına erişimde 404 (NOT_FOUND), 403 (FORBIDDEN) değil
3. **SUPER_ADMIN İstisnası**: Super Admin tüm tenant'ları görebilir — bu loglanmalı
4. **Tenant ID Injection**: Kullanıcı tenant_id'yi kendisi gönderemez; JWT'den alınır
5. **Token Süresi**: 24 saat — refresh token mekanizması ayrı bir SDD'de ele alınacak

---

## 12. Related SDDs

| SDD | İlişki |
|-----|--------|
| Authentication & Login | Supabase Auth + JWT custom claims ✅ |
| Audit Logging | Multi-tenant audit logları ✅ |
| Device Management | Tenant-scoped device CRUD ✅ |
| Technician Assignment | Tenant-scoped technician yönetimi ✅ |
| Service Records | TDS, basınç, kaçak, filtre, imza, PDF ✅ |
| Filter Tracking | Ömür hesaplama + bakım tarihi ✅ |
| Maintenance Reminders | Cron + WhatsApp hatırlatmaları ✅ |
| Survey System | Memnuniyet anketi + kupon ✅ |
| Coupon System | Kod, yüzde, süre, limit ✅ |
| Inventory Management | Stok giriş/çıkış + kritik uyarı ✅ |
| Message Templates | Tenant bazlı değişkenli şablonlar ✅ |
| WhatsApp Integration | WAHA multi-session manager ✅ |
| Automation Engine | Trigger → Condition → Action ✅ |
| Reports | Dashboard, performans, filtre, tahmin ✅ |
| Feature Flags | Starter / Professional plan ✅ |
| Soft Delete | Tüm ana tablolarda deletedAt ✅ |
| QR Public Page | Halka açık cihaz sayfası ✅ |
