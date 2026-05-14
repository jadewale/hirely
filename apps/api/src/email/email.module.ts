import { Global, Module, Provider } from '@nestjs/common';
import { getEmailProvider } from './email.factory';
import { EMAIL_PROVIDER } from './email.provider';

// Thin Nest wrapper around the singleton. Resolving via DI is convenient
// for controllers / services that already get other deps injected; code
// outside Nest's container (auth.ts, Inngest functions) should call
// `getEmailProvider()` directly instead of constructing an injector.
const emailProviderFactory: Provider = {
  provide: EMAIL_PROVIDER,
  useFactory: () => getEmailProvider(),
};

@Global()
@Module({
  providers: [emailProviderFactory],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
