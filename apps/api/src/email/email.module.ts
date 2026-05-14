import { Global, Module, Provider } from '@nestjs/common';
import { HTTP_CLIENT } from '../http/http-client';
import type { HttpClient } from '../http/http-client';
import { createEmailProvider } from './email.factory';
import { EMAIL_PROVIDER } from './email.provider';

const emailProviderFactory: Provider = {
  provide: EMAIL_PROVIDER,
  inject: [HTTP_CLIENT],
  useFactory: (http: HttpClient) => createEmailProvider(http),
};

@Global()
@Module({
  providers: [emailProviderFactory],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
