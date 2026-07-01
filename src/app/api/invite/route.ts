import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/supabase/types';

const VALID_ROLES: UserRole[] = ['super_admin', 'tenant_admin', 'manager', 'technician', 'viewer'];

/**
 * POST /api/invite
 * Body: { email, password, fullName, role, tenantId? }
 * Creates a new auth user with the given role.
 * super_admin can create any role user in any tenant.
 * tenant_admin can only create users with role <= manager in their own tenant.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    tenantId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.email || !body.password || !body.fullName || !body.role) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email, password, fullName ve role alanları zorunludur',
        },
      },
      { status: 400 },
    );
  }

  // Validate role
  if (!VALID_ROLES.includes(body.role)) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Geçersiz rol. Geçerli roller: ${VALID_ROLES.join(', ')}`,
        },
      },
      { status: 400 },
    );
  }

  // Permission checks
  if (auth.role === 'tenant_admin') {
    // tenant_admin cannot create super_admin or tenant_admin
    if (body.role === 'super_admin' || body.role === 'tenant_admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Bu rolü oluşturma yetkiniz yok' } },
        { status: 403 },
      );
    }
    // tenant_admin users must be in the same tenant
    if (body.tenantId && body.tenantId !== auth.tenantId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Başka bir firmaya kullanıcı ekleyemezsiniz' } },
        { status: 403 },
      );
    }
  }

  // Resolve tenant_id: super_admin can leave null (no tenant), tenant_admin forces their tenant
  const effectiveTenantId =
    auth.role === 'tenant_admin'
      ? auth.tenantId
      : body.tenantId ?? null;

  // Create auth user via admin client (bypasses RLS)
  const adminClient = createAdminClient();
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.fullName,
      role: body.role,
    },
  });

  if (createError) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: createError.message } },
      { status: 500 },
    );
  }

  // Ensure the profile exists. The DB trigger should auto-create it, but
  // if the trigger is missing or failed, fall back to an explicit upsert
  // using the admin client (bypasses RLS so it always works).
  const profileData: any = {
    id: newUser.user.id,
    email: body.email,
    full_name: body.fullName,
    role: body.role,
    is_active: true,
  };
  if (effectiveTenantId) {
    profileData.tenant_id = effectiveTenantId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (adminClient.from('profiles') as any)
    .upsert(profileData, { onConflict: 'id' });

  if (profileError) {
    // Roll back auth user creation on profile failure
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: `Profil oluşturulamadı: ${profileError.message}` } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: {
        id: newUser.user.id,
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        tenantId: effectiveTenantId,
      },
    },
    { status: 201 },
  );
}
