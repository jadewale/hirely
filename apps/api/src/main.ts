import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { serve } from 'inngest/express';
import { AppModule } from './app.module';
import { inngest } from './inngest/client';
import { functions as inngestFunctions } from './inngest/functions';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // Inngest's serve() expects a parsed JSON body. Register the parser
  // explicitly BEFORE app.use() so it sits in front of the Inngest handler.
  app.useBodyParser('json', { limit: '10mb' });

  // Mount Inngest's Express handler at /api/inngest. `app.use()` bypasses
  // Nest's router (and its global prefix), so we include the prefix explicitly.
  app.use(
    '/api/inngest',
    serve({ client: inngest, functions: inngestFunctions }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
