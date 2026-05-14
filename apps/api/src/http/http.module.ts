import { Global, Module, Provider } from '@nestjs/common';
import { HTTP_CLIENT } from './http-client';
import { createHttpClient } from './http.factory';

const httpClientFactory: Provider = {
  provide: HTTP_CLIENT,
  useFactory: () => createHttpClient(),
};

@Global()
@Module({
  providers: [httpClientFactory],
  exports: [HTTP_CLIENT],
})
export class HttpModule {}
