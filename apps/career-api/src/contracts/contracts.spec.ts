import {
  roleSchema,
  applicationStatusSchema,
  paginationQuerySchema,
  idSchema,
  successResponseSchema,
} from '@career/contracts';
import { z } from 'zod';

/**
 * Proves career-api (NestJS via SWC/CommonJS) can consume @career/contracts —
 * schemas validate and infer as expected. Domain endpoints will build on these.
 */
describe('@career/contracts consumption', () => {
  it('validates the role enum', () => {
    expect(roleSchema.parse('ADMIN')).toBe('ADMIN');
    expect(() => roleSchema.parse('SUPERUSER')).toThrow();
  });

  it('exposes application status values', () => {
    expect(applicationStatusSchema.options).toContain('AWAITING_APPROVAL');
  });

  it('coerces and defaults the pagination query', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('rejects non-UUID identifiers', () => {
    expect(() => idSchema.parse('not-a-uuid')).toThrow();
  });

  it('wraps data in the success envelope', () => {
    const schema = successResponseSchema(z.object({ name: z.string() }));
    expect(schema.parse({ success: true, data: { name: 'Ada' } })).toEqual({
      success: true,
      data: { name: 'Ada' },
    });
  });
});
