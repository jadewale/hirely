import { Injectable } from '@nestjs/common';
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../email.provider';

/**
 * AWS SES implementation. Stub for now — drop in @aws-sdk/client-ses
 * and wire SendEmailCommand when we're ready to migrate off Resend.
 *
 * Keeping the file means EMAIL_PROVIDER=ses doesn't 404 in the factory;
 * it throws a clear "not implemented" error at boot so it can't ship
 * to prod by accident.
 */
@Injectable()
export class SesEmailProvider implements EmailProvider {
  sendEmail(_input: SendEmailInput): Promise<SendEmailResult> {
    throw new Error(
      'SesEmailProvider is a stub. Implement before setting EMAIL_PROVIDER=ses.',
    );
  }
}
