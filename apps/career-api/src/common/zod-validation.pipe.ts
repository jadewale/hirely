import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates a request payload against a Zod schema (RR-004 contracts). On
 * failure throws a 400 whose body matches the shared validationError contract
 * (`code: VALIDATION_ERROR` + a `validation` array). Usage:
 *   @Body(new ZodValidationPipe(candidateProfileInputSchema)) input: CandidateProfileInput
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        validation: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    return result.data;
  }
}
