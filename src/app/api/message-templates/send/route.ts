import { NextRequest, NextResponse } from 'next/server';
import { MessageTemplateRepository } from '@/repositories/message-template.repository';
import { requireRole } from '@/lib/supabase/require-role';
import { renderTemplate, extractVariables, KNOWN_VARIABLES } from '@/lib/messaging/template-engine';
import { resolveVariables } from '@/lib/messaging/variable-resolver';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

/**
 * POST /api/message-templates/send
 *
 * Bir şablonu seçip değişkenlerle doldurur ve belirtilen kanaldan gönderir.
 *
 * Body (manuel değerlerle):
 *   templateId: string  — kayıtlı şablon ID
 *   to: string          — alıcı telefon numarası
 *   values: object      — değişken değerleri (örn: { customer_name: "Ahmet", device_model: "AquaPure" })
 *   channel?: string    — "WHATSAPP" (varsayılan) | "SMS"
 *
 * Body (context-based auto-fill):
 *   templateId: string
 *   to: string
 *   customerId?: string — müşteri ID
 *   deviceId?: string   — cihaz ID
 *   ticketId?: string   — servis fişi ID
 *   technicianId?: string — teknisyen ID
 *   discountCode?: string — indirim kuponu kodu
 *   surveyLink?: string   — anket linki
 *   googleReviewLink?: string — Google Review linki
 *   channel?: string
 *
 * Response:
 *   { data: { rendered: string, sent: boolean, messageId?: string, templateName: string } }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({
    tenantId: auth.tenantId,
    role: auth.role!,
    userId: auth.userId,
  });

  try {
    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (!body.templateId || typeof body.templateId !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'templateId zorunludur' } },
        { status: 400 },
      );
    }

    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Alıcı (to) zorunludur' } },
        { status: 400 },
      );
    }

    const channel = body.channel ?? 'WHATSAPP';
    if (!['WHATSAPP', 'SMS'].includes(channel)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Kanal WHATSAPP veya SMS olmalıdır' } },
        { status: 400 },
      );
    }

    // ── Load template ───────────────────────────
    const template = await repo.findById(body.templateId);

    // Check which variables the template uses
    const usedVars = extractVariables(template.content);
    const knownKeys = new Set(KNOWN_VARIABLES.map((v) => v.key));

    // Check for unknown variables in template content
    const unknownVars = usedVars.filter((v) => !knownKeys.has(v as any));
    if (unknownVars.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Şablonda bilinmeyen değişkenler var: ${unknownVars.join(', ')}`,
            details: { unknownVars },
          },
        },
        { status: 400 },
      );
    }

    // ── Resolve variable values ─────────────────
    let values: Record<string, string>;

    if (body.values && typeof body.values === 'object') {
      // Manual values mode
      values = body.values as Record<string, string>;
    } else if (body.customerId || body.deviceId || body.ticketId || body.technicianId) {
      // Context-based auto-fill mode
      const resolved = await resolveVariables({
        tenantId: auth.tenantId!,
        customerId: body.customerId,
        deviceId: body.deviceId,
        ticketId: body.ticketId,
        technicianId: body.technicianId,
        discountCode: body.discountCode,
        surveyLink: body.surveyLink,
        googleReviewLink: body.googleReviewLink,
      });
      values = resolved as Record<string, string>;

      // Manuel verilen ek değerler varsa merge et (override eder)
      if (body.extraValues && typeof body.extraValues === 'object') {
        values = { ...values, ...(body.extraValues as Record<string, string>) };
      }
    } else {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Değişken değerleri (values) veya context ID (customerId/deviceId/ticketId) zorunludur',
          },
        },
        { status: 400 },
      );
    }

    // Check for missing values
    const missingVars = usedVars.filter(
      (v) => values[v] === undefined || values[v] === null || values[v] === '',
    );
    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Eksik değişken değerleri: ${missingVars.join(', ')}. ${missingVars.includes('survey_link') || missingVars.includes('google_review_link') ? 'Link değerlerini manuel ekleyin veya extraValues ile gönderin.' : ''}`,
            details: {
              missingVars,
              hint: missingVars.includes('survey_link') || missingVars.includes('google_review_link')
                ? 'surveyLink / googleReviewLink parametrelerini ekleyin'
                : undefined,
            },
          },
        },
        { status: 400 },
      );
    }

    // Render the template
    const rendered = renderTemplate(template.content, values);

    // ── Send via WhatsApp ────────────────────────
    const manager = getWahaManager();
    const result = await manager.sendMessage(auth.tenantId!, body.to, rendered);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'SEND_FAILED',
            message: result.error || 'Mesaj gönderilemedi',
          },
          data: { rendered, sent: false },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: {
        rendered,
        sent: true,
        messageId: result.messageId,
        templateName: template.name,
      },
    });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Şablon bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
