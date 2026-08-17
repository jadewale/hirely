import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DATABASE } from '../db/database.token';
import { AssistantProfileService } from './assistant-profile.service';

// No jest.mock('@career/db') needed: postgres-js connects lazily, so importing
// the real client here never opens a socket. The injected `db` below is a stub,
// so no query ever reaches Postgres.

type DbMethod =
  | 'select'
  | 'from'
  | 'where'
  | 'insert'
  | 'values'
  | 'onConflictDoUpdate'
  | 'update'
  | 'set'
  | 'limit'
  | 'returning';

type DbMock = Record<DbMethod, jest.Mock>;

/**
 * A chainable Drizzle stub. Every builder method returns the same object; the
 * terminal calls the service awaits (`limit`, `returning`) are the ones a test
 * sets a resolved value on.
 */
function makeDbMock(): DbMock {
  const db = {} as DbMock;
  const chain: DbMethod[] = [
    'select',
    'from',
    'where',
    'insert',
    'values',
    'onConflictDoUpdate',
    'update',
    'set',
  ];
  for (const m of chain) db[m] = jest.fn(() => db);
  db.limit = jest.fn();
  db.returning = jest.fn();
  return db;
}

const ROW = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'user_1',
  displayName: 'Avery Assistant',
  headline: null,
  bio: null,
  timezone: null,
  hourlyRateCents: null,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('AssistantProfileService', () => {
  let db: DbMock;
  let service: AssistantProfileService;

  beforeEach(async () => {
    db = makeDbMock();
    const moduleRef = await Test.createTestingModule({
      providers: [AssistantProfileService, { provide: DATABASE, useValue: db }],
    }).compile();
    service = moduleRef.get(AssistantProfileService);
  });

  describe('getByUserId', () => {
    it('returns null when no profile exists', async () => {
      db.limit.mockResolvedValue([]);
      await expect(service.getByUserId('user_1')).resolves.toBeNull();
    });

    it('returns the row when a profile exists', async () => {
      db.limit.mockResolvedValue([ROW]);
      await expect(service.getByUserId('user_1')).resolves.toBe(ROW);
    });
  });

  describe('upsertForUser', () => {
    it('coalesces omitted optional fields to null and does not touch status', async () => {
      db.returning.mockResolvedValue([ROW]);
      await service.upsertForUser('user_1', { displayName: 'Avery Assistant' });

      expect(db.values).toHaveBeenCalledWith({
        userId: 'user_1',
        displayName: 'Avery Assistant',
        headline: null,
        bio: null,
        timezone: null,
        hourlyRateCents: null,
      });
      const [conflictArg] = db.onConflictDoUpdate.mock.calls[0] as [
        { set: Record<string, unknown> },
      ];
      expect(conflictArg.set).not.toHaveProperty('status');
      expect(conflictArg.set.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('setStatus', () => {
    it('returns the updated row', async () => {
      db.returning.mockResolvedValue([{ ...ROW, status: 'SUSPENDED' }]);
      const row = await service.setStatus('user_1', 'SUSPENDED');
      expect(row.status).toBe('SUSPENDED');
    });

    it('throws 404 when the target has no profile', async () => {
      db.returning.mockResolvedValue([]);
      await expect(
        service.setStatus('ghost', 'SUSPENDED'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('toDto', () => {
    it('serializes timestamps to ISO strings', () => {
      expect(AssistantProfileService.toDto(ROW)).toEqual({
        id: ROW.id,
        userId: 'user_1',
        displayName: 'Avery Assistant',
        headline: null,
        bio: null,
        timezone: null,
        hourlyRateCents: null,
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
    });
  });
});
