import { Global, Module, Provider } from '@nestjs/common';
import { AxiosHttpClient } from './clients/axios.client';
import { FetchHttpClient } from './clients/fetch.client';
import { HTTP_CLIENT } from './http-client';

const httpClientFactory: Provider = {
  provide: HTTP_CLIENT,
  useFactory: () => {
    const choice = (process.env.HTTP_CLIENT ?? 'fetch').toLowerCase();
    switch (choice) {
      case 'fetch':
        return new FetchHttpClient();
      case 'axios':
        return new AxiosHttpClient();
      default:
        throw new Error(
          `Unknown HTTP_CLIENT="${choice}". Expected one of: fetch, axios.`,
        );
    }
  },
};

@Global()
@Module({
  providers: [httpClientFactory],
  exports: [HTTP_CLIENT],
})
export class HttpModule {}
