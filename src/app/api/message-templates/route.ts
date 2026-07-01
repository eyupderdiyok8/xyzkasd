import { NextRequest, NextResponse } from 'next/server';
import { MessageTemplateRepository } from '@/repositories/message-template.repository';
import { requireFeature } from '@/lib/supabase/require-feature';
import { validateAndExtractVariables } from './utils';

/**
 * GET /api/message-templates
 * Query params:
 *   ?showAll=true  — include inactive templates
 */
export async function GET(request: NextRequest) {
  const auth = await requireFeature('viewer', 'message_templates');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('showAll') === 'true';
    const showDeleted = searchParams.get('showDeleted') === 'true' && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');
    const templates = await repo.findAll(includeInactive, showDeleted);
    return NextResponse.json({ data: templates });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/message-templates
 * Body: { name: string, content: string, variables?: string }
 *
 * name      — şablon adı (örn: "Bakım Hatırlatma")
 * content   — {{variable}} içeren şablon metni
 * variables — isteğe bağlı JSON string (kullanılan değişken listesi)
 */
export async function POST(request: NextRequest) {
  const auth = await requireFeature('manager', 'message_templates');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Şablon adı zorunludur' } },
        { status: 400 },
      );
    }

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Şablon içeriği zorunludur' } },
        { status: 400 },
      );
    }

    // Extract and validate variables from content
    const { usedVars, unknownVars } = validateAndExtractVariables(body.content);
    if (unknownVars.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Bilinmeyen değişkenler: ${unknownVars.join(', ')}`,
            details: { unknownVars, knownVariables: ['customer_name', 'device_model', 'next_service_date', 'company_name', 'phone', 'technician', 'discount_code'] },
          },
        },
        { status: 400 },
      );
    }

    const template = await repo.create({
      name: body.name.trim(),
      content: body.content.trim(),
      variables: body.variables ?? JSON.stringify(usedVars),
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
