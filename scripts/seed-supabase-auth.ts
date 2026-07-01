// ──────────────────────────────────────────────
// Supabase Auth + RBAC Seed Script
// ──────────────────────────────────────────────
// Creates auth users + profiles for testing.
//
// Usage:
//   npx tsx scripts/seed-supabase-auth.ts
//
// Prerequisites:
//   1. Run supabase/migrations/*.sql files in Supabase SQL Editor
//   2. .env.local must contain SUPABASE_SERVICE_ROLE_KEY
// ──────────────────────────────────────────────

import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TENANTS = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'Ana Su Arıtma A.Ş.', slug: 'ana-su' },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Temiz Su Hizmetleri Ltd.', slug: 'temiz-su' },
];

const SEED_USERS = [
  { email: 'super@admin.com', password: 'admin123456', fullName: 'Super Admin', role: 'super_admin' as const, tenantSlug: null },
  { email: 'admin@ana-su.com', password: 'admin123456', fullName: 'Ahmet Yönetici', role: 'tenant_admin' as const, tenantSlug: 'ana-su' },
  { email: 'manager@ana-su.com', password: 'admin123456', fullName: 'Mehmet Müdür', role: 'manager' as const, tenantSlug: 'ana-su' },
  { email: 'tech@ana-su.com', password: 'admin123456', fullName: 'Ali Teknisyen', role: 'technician' as const, tenantSlug: 'ana-su' },
  { email: 'viewer@ana-su.com', password: 'admin123456', fullName: 'Ayşe İzleyici', role: 'viewer' as const, tenantSlug: 'ana-su' },
  { email: 'admin@temiz-su.com', password: 'admin123456', fullName: 'Fatma Admin', role: 'tenant_admin' as const, tenantSlug: 'temiz-su' },
  { email: 'tech@temiz-su.com', password: 'admin123456', fullName: 'Veli Teknisyen', role: 'technician' as const, tenantSlug: 'temiz-su' },
];

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🚀 Starting Supabase auth seed...\n');

  // 1. Upsert tenants
  console.log('--- Tenants ---');
  for (const t of TENANTS) {
    const { data: existing } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', t.slug)
      .single();

    if (existing) {
      console.log(`  ✓ Tenant "${t.name}" already exists`);
    } else {
      const { error } = await admin.from('tenants').insert({
        id: t.id,
        name: t.name,
        slug: t.slug,
        is_active: true,
      });
      if (error) {
        console.error(`  ✗ Failed to create tenant "${t.name}":`, error.message);
      } else {
        console.log(`  ✓ Tenant "${t.name}" created`);
      }
    }
  }

  // 2. Create auth users + profiles
  console.log('\n--- Users ---');
  for (const u of SEED_USERS) {
    // Check if auth user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users.find((x) => x.email === u.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log(`  ✓ Auth user "${u.email}" already exists`);

      // Update profile role
      const { error: profileError } = await admin
        .from('profiles')
        .update({
          role: u.role,
          full_name: u.fullName,
          is_active: true,
        })
        .eq('id', userId);

      if (profileError) {
        console.error(`  ✗ Failed to update profile for "${u.email}":`, profileError.message);
      }
    } else {
      // Create auth user
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          full_name: u.fullName,
          role: u.role,
        },
      });

      if (createError) {
        console.error(`  ✗ Failed to create auth user "${u.email}":`, createError.message);
        continue;
      }

      userId = newUser.user.id;
      console.log(`  ✓ Auth user "${u.email}" created`);
    }

    // 3. Link to tenant
    if (u.tenantSlug) {
      const tenant = TENANTS.find((t) => t.slug === u.tenantSlug);
      if (tenant) {
        const { error: linkError } = await admin
          .from('profiles')
          .update({ tenant_id: tenant.id })
          .eq('id', userId);

        if (linkError) {
          console.error(`  ✗ Failed to link "${u.email}" to tenant:`, linkError.message);
        }
      }
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('📋 Test accounts:');
  SEED_USERS.forEach((u) => {
    console.log(`   ${u.email.padEnd(25)} / ${u.password.padEnd(15)} → ${u.role}${u.tenantSlug ? ` @ ${u.tenantSlug}` : ''}`);
  });
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
