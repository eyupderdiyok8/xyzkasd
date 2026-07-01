// ──────────────────────────────────────────────
// Water Purifier Service ERP — Audit Service Tests
// Multi-Tenant SaaS
//
// Tests: AuditService.log, logCreate, logUpdate, logDelete.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../audit.service';

// ─── Mock Prisma ──────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// ─── Tests ────────────────────────────────────

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── log ─────────────────────────────────

  describe('log', () => {
    it('logs a CREATE action with metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await AuditService.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'CREATE',
        entity: 'customer',
        entityId: 'cust-1',
        metadata: { new: { name: 'Ahmet' } },
        ipAddress: '192.168.1.1',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'CREATE',
          entity: 'customer',
          entityId: 'cust-1',
          metadata: JSON.stringify({ new: { name: 'Ahmet' } }),
          ipAddress: '192.168.1.1',
        },
      });
    });

    it('logs an UPDATE action with old/new values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await AuditService.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'UPDATE',
        entity: 'device',
        entityId: 'dev-1',
        metadata: { old: { status: 'ACTIVE' }, new: { status: 'PASSIVE' } },
        ipAddress: null,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'UPDATE',
          entity: 'device',
          entityId: 'dev-1',
          metadata: JSON.stringify({ old: { status: 'ACTIVE' }, new: { status: 'PASSIVE' } }),
          ipAddress: null,
        },
      });
    });

    it('handles null tenantId and userId', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-3' });

      await AuditService.log({
        action: 'DELETE',
        entity: 'service_ticket',
        entityId: 'tkt-1',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.tenantId).toBeNull();
      expect(callData.userId).toBeNull();
      expect(callData.ipAddress).toBeNull();
    });

    it('handles null metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await AuditService.log({
        tenantId: 'tenant-1',
        action: 'CREATE',
        entity: 'coupon',
        entityId: 'coup-1',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata).toBeNull();
    });

    it('serializes metadata as JSON string', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-5' });

      await AuditService.log({
        action: 'UPDATE',
        entity: 'customer',
        entityId: 'cust-1',
        metadata: { old: { name: 'Old' }, new: { name: 'New' } },
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(typeof callData.metadata).toBe('string');
      expect(JSON.parse(callData.metadata)).toEqual({ old: { name: 'Old' }, new: { name: 'New' } });
    });
  });

  // ─── logCreate ───────────────────────────

  describe('logCreate', () => {
    it('logs CREATE with new values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await AuditService.logCreate({
        tenantId: 'tenant-1',
        userId: 'user-1',
        entity: 'customer',
        entityId: 'cust-1',
        newValues: { name: 'Ahmet', email: 'ahmet@example.com' },
        ipAddress: '10.0.0.1',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'CREATE',
          entity: 'customer',
          entityId: 'cust-1',
          metadata: JSON.stringify({ new: { name: 'Ahmet', email: 'ahmet@example.com' } }),
          ipAddress: '10.0.0.1',
        },
      });
    });
  });

  // ─── logUpdate ───────────────────────────

  describe('logUpdate', () => {
    it('logs UPDATE with old/new comparison', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' });

      await AuditService.logUpdate({
        tenantId: 'tenant-1',
        userId: 'user-1',
        entity: 'device',
        entityId: 'dev-1',
        oldValues: { status: 'ACTIVE', location: 'Depo A' },
        newValues: { status: 'PASSIVE', location: 'Depo B' },
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('UPDATE');
      expect(JSON.parse(callData.metadata)).toEqual({
        old: { status: 'ACTIVE', location: 'Depo A' },
        new: { status: 'PASSIVE', location: 'Depo B' },
      });
    });
  });

  // ─── logDelete ───────────────────────────

  describe('logDelete', () => {
    it('logs DELETE with deleted values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-3' });

      await AuditService.logDelete({
        tenantId: 'tenant-1',
        userId: 'user-1',
        entity: 'customer',
        entityId: 'cust-1',
        deletedValues: { name: 'Ahmet', email: 'ahmet@example.com' },
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.action).toBe('DELETE');
      expect(JSON.parse(callData.metadata)).toEqual({
        deleted: { name: 'Ahmet', email: 'ahmet@example.com' },
      });
    });

    it('logs DELETE without deletedValues', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-4' });

      await AuditService.logDelete({
        entity: 'service_ticket',
        entityId: 'tkt-1',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(callData.metadata).toBeNull();
    });
  });
});
