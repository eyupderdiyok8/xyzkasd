import { NextRequest, NextResponse } from 'next/server';
import { MessageTemplateRepository } from '@/repositories/message-template.repository';
import { requireFeature } from '@/lib/supabase/require-feature';
import { validateAndExtractVariables } from '../utils';

/**
 * GET /api/message-templates/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireFeature('viewer', 'message_templates');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const template = await repo.findById(id);
    return NextResponse.json({ data: template });
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

/**
 * PATCH /api/message-templates/[id]
 * Body: { name?, content?, variables?, isActive? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireFeature('manager', 'message_templates');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Şablon adı boş olamaz' } },
        { status: 400 },
      );
    }

    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim().length === 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Şablon içeriği boş olamaz' } },
          { status: 400 },
        );
      }

      // Validate variables in content
      const { unknownVars } = validateAndExtractVariables(body.content);
      if (unknownVars.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: `Bilinmeyen değişkenler: ${unknownVars.join(', ')}`,
              details: { unknownVars },
            },
          },
          { status: 400 },
        );
      }
    }

    const template = await repo.update(id, {
      name: body.name,
      content: body.content,
      variables: body.variables,
      isActive: body.isActive,
    });

    return NextResponse.json({ data: template });
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

/**
 * DELETE /api/message-templates/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireFeature('manager', 'message_templates');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    await repo.delete(id);
    return NextResponse.json({ data: { id: id, deleted: true } });
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
