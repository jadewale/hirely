import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { SesEmailProvider } from './ses.provider';

/**
 * We don't want to talk to AWS in unit tests, so we hand the provider a
 * minimal client whose `send` is a Jest mock. Casting through `unknown` is
 * intentional — we are only honoring the one method the provider calls.
 */
const buildMockClient = (
  send: (
    cmd: SendEmailCommand,
  ) => Promise<{ MessageId?: string }> | Promise<never>,
): SESv2Client => ({ send }) as unknown as SESv2Client;

describe('SesEmailProvider', () => {
  it('sends through SESv2 SendEmailCommand and returns the MessageId', async () => {
    const sendMock = jest.fn((cmd: SendEmailCommand) => {
      expect(cmd).toBeInstanceOf(SendEmailCommand);
      const input = cmd.input;
      expect(input.FromEmailAddress).toBe('noreply@hirely.io');
      expect(input.Destination?.ToAddresses).toEqual(['x@example.com']);
      const simple = input.Content?.Simple;
      expect(simple?.Subject?.Data).toBe('hi');
      expect(simple?.Body?.Html?.Data).toBe('<p>hi</p>');
      expect(simple?.Body?.Text?.Data).toBe('hi (plaintext)');
      return Promise.resolve({ MessageId: 'ses-msg-42' });
    });

    const provider = new SesEmailProvider(buildMockClient(sendMock));
    const result = await provider.sendEmail({
      to: 'x@example.com',
      from: 'noreply@hirely.io',
      subject: 'hi',
      html: '<p>hi</p>',
      text: 'hi (plaintext)',
    });

    expect(result.id).toBe('ses-msg-42');
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('omits the Text body when caller did not pass one', async () => {
    const sendMock = jest.fn((cmd: SendEmailCommand) => {
      const simple = cmd.input.Content?.Simple;
      expect(simple?.Body?.Html?.Data).toBe('<p>html only</p>');
      expect(simple?.Body?.Text).toBeUndefined();
      return Promise.resolve({ MessageId: 'ses-msg-1' });
    });

    const provider = new SesEmailProvider(buildMockClient(sendMock));
    await provider.sendEmail({
      to: 'x@example.com',
      from: 'noreply@hirely.io',
      subject: 'no-text',
      html: '<p>html only</p>',
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('forwards SES_CONFIGURATION_SET so bounce/complaint events flow to SNS', async () => {
    process.env.SES_CONFIGURATION_SET = 'hirely-prod-email';
    try {
      const sendMock = jest.fn((cmd: SendEmailCommand) => {
        expect(cmd.input.ConfigurationSetName).toBe('hirely-prod-email');
        return Promise.resolve({ MessageId: 'ses-msg-cs' });
      });
      const provider = new SesEmailProvider(buildMockClient(sendMock));
      await provider.sendEmail({
        to: 'x@example.com',
        from: 'noreply@hirely.io',
        subject: 'cs',
        html: '<p>cs</p>',
      });
      expect(sendMock).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.SES_CONFIGURATION_SET;
    }
  });

  it('wraps SDK errors with the SES error name so logs are greppable', async () => {
    const provider = new SesEmailProvider(
      buildMockClient(() => {
        const err = new Error('Email address is not verified');
        err.name = 'MessageRejected';
        return Promise.reject(err);
      }),
    );
    await expect(
      provider.sendEmail({
        to: 'x@example.com',
        from: 'unverified@example.com',
        subject: 'rejected',
        html: '<p>x</p>',
      }),
    ).rejects.toThrow(/SES send failed: MessageRejected/);
  });

  it('throws if SES returns a successful response without a MessageId', async () => {
    const provider = new SesEmailProvider(
      buildMockClient(() => Promise.resolve({})),
    );
    await expect(
      provider.sendEmail({
        to: 'x@example.com',
        from: 'noreply@hirely.io',
        subject: 'no-id',
        html: '<p>x</p>',
      }),
    ).rejects.toThrow(/SES send failed/);
  });
});
