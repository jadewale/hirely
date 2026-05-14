import { Injectable, Logger } from '@nestjs/common';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../email.provider';

/**
 * AWS SES v2 implementation.
 *
 * Authentication comes from the ECS task role (no env-var API key). The SDK
 * picks up credentials via the standard provider chain — in prod that's the
 * task role attached to `aws_ecs_task_definition`; locally it's `AWS_PROFILE`
 * or env vars. There is intentionally no secret to store in SSM.
 *
 * `ConfigurationSetName` (env: `SES_CONFIGURATION_SET`) is optional but
 * recommended: it's the SES hook for bounce/complaint events to flow into
 * SNS/SQS and CloudWatch. Wire it once in Terraform, leave it set forever.
 *
 * Errors are logged with the SES error name/code so a misconfigured
 * identity (`MessageRejected`) is distinguishable from a credential/IAM
 * problem (`AccessDenied`) without grepping stack traces.
 */
@Injectable()
export class SesEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SesEmailProvider.name);
  private readonly client: SESv2Client;
  private readonly configurationSetName?: string;

  constructor(client?: SESv2Client) {
    // Region falls back to AWS_REGION (set automatically inside ECS) and
    // finally us-east-1 so unit tests don't fail when neither is set.
    const region =
      process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
    this.client = client ?? new SESv2Client({ region });
    this.configurationSetName = process.env.SES_CONFIGURATION_SET || undefined;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const command = new SendEmailCommand({
      FromEmailAddress: input.from,
      Destination: { ToAddresses: [input.to] },
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            ...(input.text
              ? { Text: { Data: input.text, Charset: 'UTF-8' } }
              : {}),
          },
        },
      },
      ConfigurationSetName: this.configurationSetName,
    });

    try {
      const out = await this.client.send(command);
      if (!out.MessageId) {
        // SES always returns a MessageId on success; treat the empty case
        // as a contract violation so we surface SDK regressions early.
        throw new Error('SES SendEmail returned no MessageId');
      }
      return { id: out.MessageId };
    } catch (err) {
      const name = err instanceof Error ? err.name : 'UnknownError';
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`SES ${name}: ${message}`);
      throw new Error(`SES send failed: ${name}`);
    }
  }
}
