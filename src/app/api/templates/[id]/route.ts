import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { MessageTemplateRepository } from '@/repositories/message-template.repository';

/**
 * PATCH /api/templates/:id
 *
 * Update a message template.
 *
 * Body: { name?: string, content?: string, variables?: string, isActive?: boolean }
 *
 * Response: { data: MessageTemplate }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Şablon adı geçersiz' } },
          { status: 400 },
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.content !== undefined) {
      if (typeof body.content !== 'string') {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Şablon metni geçersiz' } },
          { status: 400 },
        );
      }
      updateData.content = body.content.trim();
    }

    if (body.variables !== undefined) {
      updateData.variables = body.variables;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const updated = await repo.update(id, updateData);

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Şablon bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Şablon güncellenirken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/templates/:id
 *
 * Delete a message template (soft: sets isActive=false).
 *
 * Response: { success: boolean }
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } },
      { status: 401 },
    );
  }

  try {
    const repo = new MessageTemplateRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    await repo.delete(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Şablon bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Şablon silinirken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
