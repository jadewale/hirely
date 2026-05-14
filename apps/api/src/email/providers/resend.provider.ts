import { Injectable, Logger } from '@nestjs/common';
import type { HttpClient } from '../../http/http-client';
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../email.provider';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey: string;

  constructor(private readonly http: HttpClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }
    this.apiKey = key;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await this.http.request<{ id: string }>(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: input,
      },
    );

    if (!res.ok || !res.data?.id) {
      this.logger.error(`Resend ${res.status}: ${res.rawText}`);
      throw new Error(`Resend send failed: ${res.status}`);
    }

    return { id: res.data.id };
  }
}
