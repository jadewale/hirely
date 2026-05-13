import { Test } from '@nestjs/testing';
import type { Database } from '../db';
import { HealthController } from './health.controller';

const fakeDb = (executeImpl: () => Promise<unknown>) =>
  ({ execute: jest.fn(executeImpl) }) as unknown as Database;

describe('HealthController', () => {
  const buildController = async (db: Database) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: 'DATABASE', useValue: db }],
    }).compile();
    return moduleRef.get(HealthController);
  };

  it('reports ok + db:up when select 1 succeeds', async () => {
    const controller = await buildController(
      fakeDb(() => Promise.resolve([{ '?column?': 1 }])),
    );
    const res = await controller.check();
    expect(res.status).toBe('ok');
    expect(res.db).toBe('up');
    expect(typeof res.uptime).toBe('number');
    expect(typeof res.timestamp).toBe('string');
  });

  it('reports degraded + db:down when select 1 throws', async () => {
    const controller = await buildController(
      fakeDb(() => Promise.reject(new Error('boom'))),
    );
    const res = await controller.check();
    expect(res.status).toBe('degraded');
    expect(res.db).toBe('down');
  });
});
