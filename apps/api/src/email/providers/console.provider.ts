import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../email.provider';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);
  private readonly sent: SendEmailInput[] = [];

  sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    this.sent.push(input);
    this.logger.log(
      `[email:console] to=${input.to} subject=${JSON.stringify(input.subject)}`,
    );
    this.logger.debug(input.text ?? input.html);
    return Promise.resolve({ id: `console_${this.sent.length}` });
  }

  /** Test helper. Lets e2e tests inspect what was sent. */
  drain(): SendEmailInput[] {
    return this.sent.splice(0, this.sent.length);
  }
}
