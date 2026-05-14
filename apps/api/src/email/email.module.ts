import { Global, Module, Provider } from '@nestjs/common';
import { HTTP_CLIENT } from '../http/http-client';
import type { HttpClient } from '../http/http-client';
import { EMAIL_PROVIDER } from './email.provider';
import { ConsoleEmailProvider } from './providers/console.provider';
import { ResendEmailProvider } from './providers/resend.provider';
import { SesEmailProvider } from './providers/ses.provider';

const emailProviderFactory: Provider = {
  provide: EMAIL_PROVIDER,
  inject: [HTTP_CLIENT],
  useFactory: (http: HttpClient) => {
    const choice = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
    switch (choice) {
      case 'resend':
        return new ResendEmailProvider(http);
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
