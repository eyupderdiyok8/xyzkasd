import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ProfileRow, Database } from '@/lib/supabase/types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * GET /api/users
 * Returns all profiles. Restricted to super_admin and tenant_admin.
 * tenant_admin sees only users within their tenant; super_admin sees all.
 */
export async function GET() {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // tenant_admin sees only their own tenant; super_admin sees all
  if (auth.role === 'tenant_admin' && auth.tenantId) {
    query = query.eq('tenant_id', auth.tenantId);
  }

  const { data: _users, error } = await query.limit(100);
  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 },
    );
  }

  const users = (_users ?? []) as ProfileRow[];
  return NextResponse.json({ data: users });
}

/**
 * PATCH /api/users
 * Body: { id, role?, is_active?, tenant_id? }
 * Update a user's role, active status, or tenant assignment.
 * super_admin can update any user; tenant_admin can update users within their tenant
 * but cannot assign roles higher than tenant_admin.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: { id: string; role?: string; is_active?: boolean; tenant_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Kullanıcı ID gereklidir' } },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  // Fetch target user to verify permissions
  const { data: _target } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', body.id)
    .single();
  const target = _target as ProfileRow | null;
  if (!target) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
      { status: 404 },
    );
  }

  // Permission checks
  if (auth.role === 'tenant_admin') {
    // tenant_admin can only manage users in their own tenant
    if (target.tenant_id !== auth.tenantId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Bu kullanıcıyı yönetme yetkiniz yok' } },
        { status: 403 },
      );
    }
    // tenant_admin cannot assign super_admin or tenant_admin roles
    if (body.role && (body.role === 'super_admin' || body.role === 'tenant_admin')) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Bu rolü atama yetkiniz yok' } },
        { status: 403 },
      );
    }
    // tenant_admin cannot change tenant_id
    if (body.tenant_id && body.tenant_id !== auth.tenantId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Firma değiştirme yetkiniz yok' } },
        { status: 403 },
      );
    }
  }

  // Build update payload
  const update: ProfileUpdate = {};
  if (body.role !== undefined) update.role = body.role as any;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.tenant_id !== undefined) update.tenant_id = body.tenant_id;

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Güncellenecek alan bulunamadı' } },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('profiles') as any)
    .update(update)
    .eq('id', body.id);

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: updateError.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id: body.id, ...update } });
}
