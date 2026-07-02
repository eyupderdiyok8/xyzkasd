// ──────────────────────────────────────────────
// Water Purifier Service ERP — Tenant Plan API
// Multi-Tenant SaaS
//
// GET  /api/admin/plan  — fetch current tenant plan
// PATCH /api/admin/plan  — switch tenant plan (manual)
// ──────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLAN_LABELS, type PlanType } from '@/lib/features';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

/**
 * GET /api/admin/plan
 *
 * Returns the current tenant settings (plan, contact info, logo).
 */
export async function GET() {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  if (!auth.tenantId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Tenant bulunamadı' } },
      { status: 404 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug, plan, logo, phone, email, address, reportConfig, google_review_url, survey_message, mfa_required')
      .eq('id', auth.tenantId)
      .single();

    const row = tenant as unknown as (TenantRow & { logo?: string | null; phone?: string | null; email?: string | null; address?: string | null; reportConfig?: string | null; google_review_url?: string | null; survey_message?: string | null }) | null;

    if (!row) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tenant bulunamadı' } },
        { status: 404 },
      );
    }

    const plan = (row.plan as PlanType) ?? 'STARTER';

    return NextResponse.json({
      data: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        plan,
        planLabel: PLAN_LABELS[plan] ?? 'Starter',
        logo: row.logo ?? null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        address: row.address ?? null,
        reportConfig: row.reportConfig ?? null,
        googleReviewUrl: row.google_review_url ?? null,
        surveyMessage: row.survey_message ?? null,
        mfaRequired: (row as any).mfa_required ?? false,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Plan bilgisi alınırken hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/plan
 * Body: { plan?, name?, phone?, email?, address?, logo? }
 *
 * Update tenant settings. All fields optional.
 * Only tenant_admin+ can update.
 */
export async function PATCH(request: Request) {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  if (!auth.tenantId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Tenant bulunamadı' } },
      { status: 404 },
    );
  }

  try {
    const body = (await request.json()) as {
      plan?: string;
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      logo?: string | null;
      reportConfig?: string | null;
      googleReviewUrl?: string | null;
      surveyMessage?: string | null;
    };

    // Build update payload — only include fields that are present
    const updates: Record<string, unknown> = {};

    if (body.plan !== undefined) {
      if (!['STARTER', 'PROFESSIONAL'].includes(body.plan)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Geçerli bir plan belirtin: STARTER veya PROFESSIONAL' } },
          { status: 400 },
        );
      }
      updates.plan = body.plan;
    }

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

    // Logo — accept data URL or null to clear
    if (body.logo !== undefined) {
      if (body.logo && typeof body.logo === 'string' && body.logo.startsWith('data:image/')) {
        updates.logo = body.logo;
      } else if (body.logo === null) {
        updates.logo = null;
      }
    }

    // Report config — validate JSON if present
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('tenants') as any)
      .update(updates)
      .eq('id', auth.tenantId);

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: updateError.message } },
        { status: 500 },
      );
    }

    const planLabel = updates.plan
      ? PLAN_LABELS[updates.plan as PlanType] ?? String(updates.plan)
      : undefined;

    return NextResponse.json({
      data: { ...updates, planLabel },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Güncellenirken hata oluştu' } },
      { status: 500 },
    );
  }
}
