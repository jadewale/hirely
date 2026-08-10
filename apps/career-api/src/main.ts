import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // bodyParser: false — AuthModule.forRoot() owns body-parser wiring (its raw
  // body handling is required for Better Auth). Do NOT re-add parsers here.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  configureApp(app);

  const port = process.env.PORT ?? 4100;
  await app.listen(port);
  logger.log(`career-api listening on :${port}`);
}
void bootstrap();
