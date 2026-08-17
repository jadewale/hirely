import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z
    .object({
      name: z.string().min(1),
      // Coercion proves the pipe returns parsed (not raw) data.
      age: z.coerce.number().int().min(0),
    })
    .strict();

  it('returns the parsed (and coerced) value on success', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: 'Ada', age: '42' })).toEqual({
      name: 'Ada',
      age: 42,
    });
  });

  it('throws a 400 with a structured validation array on failure', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ name: '', age: -1 });
      fail('expected the pipe to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        code: string;
        validation: { path: string }[];
      };
      expect(body.code).toBe('VALIDATION_ERROR');
      const paths = body.validation.map((v) => v.path).sort();
      expect(paths).toEqual(['age', 'name']);
    }
  });

  it('rejects unknown keys under a strict schema', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(() => pipe.transform({ name: 'Ada', age: 1, role: 'ADMIN' })).toThrow(
      BadRequestException,
    );
  });
});
