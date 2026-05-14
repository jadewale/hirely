export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  id: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
