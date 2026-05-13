import { Test } from '@nestjs/testing';
import type { Database } from '../db';
import { HealthService } from './health.service';

const fakeDb = (executeImpl: () => Promise<unknown>) =>
  ({ execute: jest.fn(executeImpl) }) as unknown as Database;

describe('HealthService', () => {
  const build = async (db: Database) => {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: 'DATABASE', useValue: db }],
    }).compile();
    return moduleRef.get(HealthService);
  };

  it('reports ok + db:up when select 1 succeeds', async () => {
    const svc = await build(fakeDb(() => Promise.resolve([{ '?column?': 1 }])));
    const res = await svc.check();
    expect(res.status).toBe('ok');
    expect(res.db).toBe('up');
    expect(typeof res.uptime).toBe('number');
    expect(typeof res.timestamp).toBe('string');
  });

  it('reports degraded + db:down when select 1 throws', async () => {
    const svc = await build(fakeDb(() => Promise.reject(new Error('boom'))));
    const res = await svc.check();
    expect(res.status).toBe('degraded');
    expect(res.db).toBe('down');
  });
});
