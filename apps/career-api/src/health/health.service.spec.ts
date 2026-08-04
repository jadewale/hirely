import { Test } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const build = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();
    return moduleRef.get(HealthService);
  };

  it('reports ok with numeric uptime and an ISO timestamp', async () => {
    const svc = await build();
    const res = svc.check();
    expect(res.status).toBe('ok');
    expect(typeof res.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(res.timestamp))).toBe(false);
  });
});
