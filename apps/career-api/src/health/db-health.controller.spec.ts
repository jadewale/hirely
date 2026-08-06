import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { checkDatabase } from '@career/db';
import { DATABASE } from '../db/database.token';
import { DbHealthController } from './db-health.controller';

// Mock the whole DB package so the unit test never opens a real connection.
jest.mock('@career/db', () => ({
  checkDatabase: jest.fn(),
}));

const checkDatabaseMock = checkDatabase as jest.MockedFunction<
  typeof checkDatabase
>;

describe('DbHealthController', () => {
  let controller: DbHealthController;

  beforeEach(async () => {
    checkDatabaseMock.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [DbHealthController],
      providers: [{ provide: DATABASE, useValue: {} }],
    }).compile();
    controller = moduleRef.get(DbHealthController);
  });

  it('returns ok with latency when the database responds', async () => {
    checkDatabaseMock.mockResolvedValue({ ok: true, latencyMs: 5 });
    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      latencyMs: 5,
    });
  });

  it('throws 503 when the database is unreachable', async () => {
    checkDatabaseMock.mockRejectedValue(new Error('connection refused'));
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
