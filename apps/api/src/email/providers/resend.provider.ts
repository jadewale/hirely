import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../email.provider';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey: string;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }
    this.apiKey = key;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend ${res.status}: ${body}`);
      throw new Error(`Resend send failed: ${res.status}`);
    }

    const json = (await res.json()) as { id: string };
    return { id: json.id };
  }
}
