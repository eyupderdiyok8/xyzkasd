import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { MessageTemplateRepository } from '@/repositories/message-template.repository';

/**
 * GET /api/templates
 *
 * Returns all message templates for the current tenant.
 *
 * Response: { data: MessageTemplate[] }
 */
export async function GET() {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } },
      { status: 401 },
    );
  }

  try {
    const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const templates = await repo.findAll(false);

    return NextResponse.json({ data: templates });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Şablonlar alınırken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/templates
 *
 * Create a new message template.
 *
 * Body: { name: string, content: string, variables?: string }
 *
 * Response: { data: MessageTemplate }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Şablon adı (name) zorunludur',
          },
        },
        { status: 400 },
      );
    }

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Şablon metni (content) zorunludur',
          },
        },
        { status: 400 },
      );
    }

    const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const template = await repo.create({
      name: body.name.trim(),
      content: body.content.trim(),
      variables: body.variables || '',
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Şablon oluşturulurken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
