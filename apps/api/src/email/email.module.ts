import { Global, Module, Provider } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.provider';
import { ConsoleEmailProvider } from './providers/console.provider';
import { ResendEmailProvider } from './providers/resend.provider';
import { SesEmailProvider } from './providers/ses.provider';

const emailProviderFactory: Provider = {
  provide: EMAIL_PROVIDER,
  useFactory: () => {
    const choice = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
    switch (choice) {
      case 'resend':
        return new ResendEmailProvider();
      case 'ses':
        return new SesEmailProvider();
      case 'console':
        return new ConsoleEmailProvider();
      default:
        throw new Error(
          `Unknown EMAIL_PROVIDER="${choice}". Expected one of: resend, ses, console.`,
        );
    }
  },
};

@Global()
@Module({
  providers: [emailProviderFactory],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
