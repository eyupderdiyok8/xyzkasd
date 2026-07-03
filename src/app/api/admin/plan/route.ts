// ──────────────────────────────────────────────
// Water Purifier Service ERP — Üyelik Yönetimi API
// Multi-Tenant SaaS
//
// GET  /api/admin/plan  — mevcut tenant üyelik bilgisi
// PATCH /api/admin/plan  — üyelik ayarlarını güncelle (tenant_admin)
// POST /api/admin/plan   — super_admin herhangi bir firmaya üyelik atar
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  MEMBERSHIP_LABELS,
  isMembershipActive,
  getRemainingDays,
  formatRemainingDays,
  type MembershipType,
} from '@/lib/features';

const VALID_TYPES: MembershipType[] = ['MONTHLY', 'YEARLY', 'FOUNDER'];
const SELECT_TENANT_MESSAGE = 'Firma ayarlarını görüntülemek için üstteki firma seçiciden bir firma seçin.';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  membershipType: string;
  membershipExpiresAt: string | null;
}

function noTenantResponse(role: string | null, forWrite = false) {
  if (role === 'super_admin') {
    return NextResponse.json(
      {
        data: null,
        meta: {
          requiresTenantSelection: true,
          message: forWrite ? 'Firma seçmeden bu ayarlar kaydedilemez.' : SELECT_TENANT_MESSAGE,
        },
      },
      { status: forWrite ? 400 : 200 },
    );
  }

  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: 'Tenant bulunamadı' } },
    { status: 404 },
  );
}

/**
 * GET /api/admin/plan
 * Kendi tenant'ının üyelik bilgisini getir.
 */
export async function GET() {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  if (!auth.tenantId) return noTenantResponse(auth.role);

  try {
    const supabase = createAdminClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug, membershipType, membershipExpiresAt, logo, phone, email, address, reportConfig, google_review_url, survey_message, mfa_required')
      .eq('id', auth.tenantId)
      .single();

    const row = tenant as unknown as (TenantRow & {
      logo?: string | null; phone?: string | null; email?: string | null;
      address?: string | null; reportConfig?: string | null;
      google_review_url?: string | null; survey_message?: string | null;
      mfa_required?: boolean;
    }) | null;

    if (!row) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tenant bulunamadı' } },
        { status: 404 },
      );
    }

    const membershipType = (row.membershipType as MembershipType) || 'MONTHLY';
    const expiresAt = row.membershipExpiresAt ?? null;
    const active = isMembershipActive(membershipType, expiresAt);
    const remainingDays = membershipType === 'FOUNDER' ? Infinity : getRemainingDays(expiresAt);

    return NextResponse.json({
      data: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        membershipType,
        membershipLabel: MEMBERSHIP_LABELS[membershipType] ?? 'Aylık',
        membershipExpiresAt: expiresAt,
        isActive: active,
        remainingDays,
        remainingLabel: formatRemainingDays(remainingDays),
        logo: row.logo ?? null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        address: row.address ?? null,
        reportConfig: row.reportConfig ?? null,
        googleReviewUrl: row.google_review_url ?? null,
        surveyMessage: row.survey_message ?? null,
        mfaRequired: row.mfa_required ?? false,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Üyelik bilgisi alınırken hata oluştu';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/plan
 * Kendi tenant ayarlarını güncelle (isim, logo, iletişim vb.)
 * Üyelik tipini DEĞİŞTİREMEZ — sadece super_admin değiştirebilir.
 */
export async function PATCH(request: Request) {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  if (!auth.tenantId) return noTenantResponse(auth.role, true);

  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      logo?: string | null;
      reportConfig?: string | null;
      googleReviewUrl?: string | null;
      surveyMessage?: string | null;
      mfaRequired?: boolean;
    };

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Firma adı boş olamaz' } },
          { status: 400 },
        );
      }
      updates.name = name;
    }

    if (body.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() : null;
    if (body.email !== undefined) updates.email = body.email ? String(body.email).trim() : null;
    if (body.address !== undefined) updates.address = body.address ? String(body.address).trim() : null;
    if (body.googleReviewUrl !== undefined) updates.google_review_url = body.googleReviewUrl ? String(body.googleReviewUrl).trim() : null;
    if (body.surveyMessage !== undefined) updates.survey_message = body.surveyMessage ? String(body.surveyMessage).trim() : null;
    if (body.mfaRequired !== undefined) updates.mfa_required = Boolean(body.mfaRequired);

    if (body.logo !== undefined) {
      if (body.logo && typeof body.logo === 'string' && body.logo.startsWith('data:image/')) {
        updates.logo = body.logo;
      } else if (body.logo === null) {
        updates.logo = null;
      }
    }

    if (body.reportConfig !== undefined) {
      if (body.reportConfig === null) {
        updates.reportConfig = null;
      } else if (typeof body.reportConfig === 'string') {
        try { JSON.parse(body.reportConfig); updates.reportConfig = body.reportConfig; }
        catch { /* ignore invalid JSON */ }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Güncellenecek alan belirtilmedi' } },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error: updateError } = await (supabase.from('tenants') as any)
      .update(updates)
      .eq('id', auth.tenantId);

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Güncellenirken hata oluştu' } },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Güncellenirken hata oluştu';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/plan
 * Super admin: herhangi bir firmaya üyelik ata.
 * Body: { tenantId, membershipType, membershipExpiresAt? }
 * FOUNDER için expiresAt opsiyonel (null = sınırsız).
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: { tenantId?: string; membershipType?: string; membershipExpiresAt?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  if (!body.tenantId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'tenantId zorunludur' } },
      { status: 400 },
    );
  }

  if (!body.membershipType || !VALID_TYPES.includes(body.membershipType as MembershipType)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Geçerli bir üyelik tipi belirtin: ${VALID_TYPES.join(', ')}` } },
      { status: 400 },
    );
  }

  const membershipType = body.membershipType as MembershipType;

  // FOUNDER için expiresAt null (sınırsız)
  // MONTHLY için varsayılan: 30 gün
  // YEARLY için varsayılan: 365 gün
  let expiresAt: Date | null = null;
  if (body.membershipExpiresAt) {
    expiresAt = new Date(body.membershipExpiresAt);
  } else if (membershipType !== 'FOUNDER') {
    const days = membershipType === 'MONTHLY' ? 30 : 365;
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  try {
    const supabase = createAdminClient();
    const expiresAtIso = expiresAt?.toISOString() ?? null;
    const { error: updateError } = await (supabase.from('tenants') as any)
      .update({
        membershipType,
        membershipExpiresAt: expiresAtIso,
      })
      .eq('id', body.tenantId);

    if (updateError) {
      console.error('[admin/plan] membership update failed', updateError);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Üyelik güncellenirken hata oluştu' } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        tenantId: body.tenantId,
        membershipType,
        membershipLabel: MEMBERSHIP_LABELS[membershipType],
        membershipExpiresAt: expiresAtIso,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Üyelik atanırken hata oluştu';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
