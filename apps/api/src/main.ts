import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { runMigrations } from './db/migrator';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Apply pending DB migrations before we accept traffic. Better Auth (and
  // anything else that touches the schema) must see a fully-migrated DB on
  // first request, otherwise sign-up fails with "relation does not exist".
  await runMigrations();

  // Nest's built-in body parser is disabled here so @thallesp/nestjs-better-auth
  // can forward raw request bodies to Better Auth's HTTP handler. The library
  // re-installs JSON / urlencoded parsers for every other (non-auth) route via
  // its `bodyParser` option in AuthModule.forRoot().
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  configureApp(app);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`api listening on :${port}`);
}
void bootstrap();
