import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DATABASE } from '../db/database.token';
import { AuditService } from './audit.service';

/**
 * Unit tests for the append-only audit service (RR-015).
 *
 * The Drizzle client is stubbed with jest fns so the tests never touch a real
 * DB. Immutability of the wire surface is asserted structurally: the class
 * exposes only `record` and `list` — no `update`, `delete`, or `truncate`.
 */
describe('AuditService', () => {
  const buildDb = () => {
    const insertReturning = jest.fn();
    const insertValues = jest.fn(() => ({ returning: insertReturning }));
    const insert = jest.fn(() => ({ values: insertValues }));

    const rowsResult: unknown[] = [];
    const countResult: Array<{ value: number }> = [{ value: 0 }];

    // The select() chain differs for rows (limit/offset) vs count (no limit).
    // The stubs return promises directly to satisfy `await` at the leaves.
    const rowsChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(() => Promise.resolve(rowsResult)),
    };
    const countChain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn(() => Promise.resolve(countResult)),
    };
    const select = jest
      .fn()
      .mockImplementationOnce(() => rowsChain)
      .mockImplementationOnce(() => countChain);

    const db = { insert, select } as const;
    return {
      db,
      insert,
      insertReturning,
      insertValues,
      rowsChain,
      countChain,
      rowsResult,
      countResult,
    };
  };

  const build = async () => {
    const stubs = buildDb();
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: DATABASE, useValue: stubs.db }],
    }).compile();
    // Suppress the fail-open error log so noisy stderr does not clutter runs.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    return { svc: moduleRef.get(AuditService), ...stubs };
  };

  const VALID_INPUT = {
    actorUserId: '11111111-1111-4111-8111-111111111111',
    actorRole: 'ADMIN' as const,
    action: 'application.submitted',
    resourceType: 'APPLICATION',
    resourceId: 'app-abc',
    requestId: 'req-1',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    metadata: { note: 'ok' },
  };

  describe('immutability of the wire surface', () => {
    it('exposes only record and list — no update/delete/truncate methods', () => {
      const banned = ['update', 'delete', 'destroy', 'remove', 'truncate'];
      for (const name of banned) {
        expect(
          (AuditService.prototype as unknown as Record<string, unknown>)[name],
        ).toBeUndefined();
      }
      expect(typeof AuditService.prototype.record).toBe('function');
      expect(typeof AuditService.prototype.list).toBe('function');
    });
  });

  describe('record', () => {
    it('inserts the row and returns { persisted: true, id }', async () => {
      const { svc, insert, insertValues, insertReturning } = await build();
      insertReturning.mockResolvedValueOnce([{ id: 'audit-1' }]);

      const result = await svc.record(VALID_INPUT);

      expect(result).toEqual({ persisted: true, id: 'audit-1' });
      expect(insert).toHaveBeenCalledTimes(1);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: VALID_INPUT.actorUserId,
          actorRole: 'ADMIN',
          action: 'application.submitted',
          resourceType: 'APPLICATION',
          metadata: { note: 'ok' },
        }),
      );
    });

    it('redacts sensitive metadata keys before insert', async () => {
      const { svc, insertValues, insertReturning } = await build();
      insertReturning.mockResolvedValueOnce([{ id: 'audit-2' }]);

      await svc.record({
        ...VALID_INPUT,
        metadata: {
          password: 'hunter2',
          token: 'sk_abc',
          before: { role: 'CANDIDATE' },
        },
      });

      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            password: '[REDACTED]',
            token: '[REDACTED]',
            before: { role: 'CANDIDATE' },
          },
        }),
      );
    });

    it('fails open on DB error: logs and resolves { persisted: false }', async () => {
      const { svc, insertReturning } = await build();
      insertReturning.mockRejectedValueOnce(new Error('connection refused'));
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      // Deliberately does NOT reject — the caller's write must not roll back.
      const result = await svc.record(VALID_INPUT);

      expect(result).toEqual({ persisted: false });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('audit write failed'),
      );
    });

    it('validates input via zod (throws on malformed action)', async () => {
      const { svc } = await build();
      await expect(
        svc.record({ ...VALID_INPUT, action: 'has spaces' }),
      ).rejects.toBeDefined();
    });

    it('accepts a null actor (system-originated events)', async () => {
      const { svc, insertValues, insertReturning } = await build();
      insertReturning.mockResolvedValueOnce([{ id: 'audit-3' }]);

      await svc.record({
        actorUserId: null,
        action: 'job.expired',
        resourceType: 'APPLICATION',
      });

      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: null }),
      );
    });
  });

  describe('list', () => {
    it('returns a paginated envelope with rows mapped to AuditEntry', async () => {
      const { svc, rowsResult, countResult } = await build();
      rowsResult.push({
        id: 'aa11',
        actorUserId: 'u1',
        actorRole: 'ADMIN',
        candidateId: null,
        assignmentId: null,
        action: 'application.submitted',
        resourceType: 'APPLICATION',
        resourceId: 'app-1',
        requestId: 'req-1',
        ipAddress: '1.2.3.4',
        userAgent: 'ua',
        metadata: { k: 1 },
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
      });
      countResult[0].value = 42;

      const res = await svc.list({});

      expect(res.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 42,
        totalPages: 3,
      });
      expect(res.data[0]).toMatchObject({
        id: 'aa11',
        action: 'application.submitted',
        createdAt: '2026-01-02T03:04:05.000Z',
      });
    });

    it('applies filters (all conditions become a single WHERE)', async () => {
      const { svc, rowsChain, countChain, countResult } = await build();
      countResult[0].value = 0;

      await svc.list({
        actorUserId: '11111111-1111-4111-8111-111111111111',
        action: 'application.submitted',
        resourceType: 'APPLICATION',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        page: 2,
        pageSize: 10,
      });

      expect(rowsChain.where).toHaveBeenCalledTimes(1);
      expect(rowsChain.limit).toHaveBeenCalledWith(10);
      expect(rowsChain.offset).toHaveBeenCalledWith(10);
      expect(countChain.where).toHaveBeenCalledTimes(1);
    });

    it('returns totalPages=1 when no rows match (never divides by zero)', async () => {
      const { svc, countResult } = await build();
      countResult[0].value = 0;

      const res = await svc.list({});
      expect(res.pagination.total).toBe(0);
      expect(res.pagination.totalPages).toBe(1);
    });
  });
});
