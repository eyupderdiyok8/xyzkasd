import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getMinimumRoleForPath, ROLE_HIERARCHY } from '@/lib/roles';
import { getRequiredFeatureForPath, hasFeature, type PlanType } from '@/lib/features';
import type { UserRole } from '@/lib/supabase/types';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/auth/callback', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/public', '/survey'];
const LOGIN_PAGE = '/login';
const FORBIDDEN_REDIRECT = '/';
const UPGRADE_REDIRECT = '/';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes unconditionally
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  // Create Supabase client from request cookies
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PAGE;
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // Fetch profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PAGE;
    url.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(url);
  }

  // RBAC: check route permission
  const minimumRole = getMinimumRoleForPath(pathname);
  if (minimumRole) {
    const userRole = profile.role as UserRole;
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
      const url = request.nextUrl.clone();
      url.pathname = FORBIDDEN_REDIRECT;
      url.search = '';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  // Plan-based feature gating
  // Block Professional-only routes if tenant is on Starter plan
  const requiredFeature = getRequiredFeatureForPath(pathname);
  if (requiredFeature && profile.tenant_id) {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('plan')
      .eq('id', profile.tenant_id)
      .single();

    const tenantPlan: PlanType = ((tenantRow as { plan: string } | null)?.plan as PlanType) ?? 'STARTER';
    if (!hasFeature(tenantPlan, requiredFeature)) {
      const url = request.nextUrl.clone();
      url.pathname = UPGRADE_REDIRECT;
      url.search = '';
      url.searchParams.set('error', 'plan_upgrade');
      url.searchParams.set('feature', requiredFeature);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files, _next, API routes, and images
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
