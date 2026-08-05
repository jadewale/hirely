import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const port = process.env.PORT ?? 4100;
  await app.listen(port);
  logger.log(`career-api listening on :${port}`);
}
void bootstrap();
