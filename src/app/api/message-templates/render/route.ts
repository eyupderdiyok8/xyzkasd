import { NextRequest, NextResponse } from 'next/server';
import { MessageTemplateRepository } from '@/repositories/message-template.repository';
import { requireFeature } from '@/lib/supabase/require-feature';
import { renderTemplate } from '@/lib/messaging/template-engine';
import { validateAndExtractVariables } from '../utils';

/**
 * POST /api/message-templates/render
 *
 * Body (by template ID):
 *   { templateId: string, values: { customer_name?: string, ... } }
 *
 * Body (inline):
 *   { content: string, values: { customer_name?: string, ... } }
 *
 * Response:
 *   { data: { rendered: string, usedVariables: string[] } }
 */
export async function POST(request: NextRequest) {
  const auth = await requireFeature('viewer', 'message_templates');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    if (!body.values || typeof body.values !== 'object') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Değişken değerleri (values) zorunludur' } },
        { status: 400 },
      );
    }

    let content: string;

    if (body.templateId) {
      // Load from saved template
      const template = await repo.findById(body.templateId);
      content = template.content;
    } else if (body.content) {
      // Inline content
      content = body.content;
    } else {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'templateId veya content zorunludur' } },
        { status: 400 },
      );
    }

    const { usedVars } = validateAndExtractVariables(content);
    const rendered = renderTemplate(content, body.values);

    return NextResponse.json({ data: { rendered, usedVariables: usedVars } });
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
