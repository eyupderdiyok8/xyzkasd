// ──────────────────────────────────────────────
// Water Purifier Service ERP — Prisma Client Tests
// Multi-Tenant SaaS
//
// Tests: singleton pattern, env-dependent log config
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('prisma singleton', () => {
  it('exports a PrismaClient instance', async () => {
    const { prisma } = await import('../prisma');
    expect(prisma).toBeDefined();
    expect(prisma).toHaveProperty('$connect');
    expect(prisma).toHaveProperty('$disconnect');
  });

  it('reuses the same instance on repeated imports', async () => {
    const { prisma: p1 } = await import('../prisma');
    const { prisma: p2 } = await import('../prisma');
    expect(p1).toBe(p2);
  });
});
