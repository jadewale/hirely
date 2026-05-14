import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { serve } from 'inngest/express';
import { inngest } from './inngest/client';
import { functions as inngestFunctions } from './inngest/functions';

/**
 * Apply runtime wiring shared by `main.ts` and end-to-end tests.
 *
 * Anything that must be in place before requests hit the app (global prefix,
 * body parsing, OpenAPI, Inngest handler) lives here so tests exercise the
 * same surface that production does.
 */
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');

  // Enables OnApplicationShutdown hooks (used by DbModule to close the
  // postgres pool on SIGTERM/SIGINT and on app.close() in tests).
  app.enableShutdownHooks();

  // Body parsing is handled by @thallesp/nestjs-better-auth's AuthModule:
  // JSON and urlencoded parsers are installed for every non-auth route, and
  // the raw body is preserved for /api/auth/* so Better Auth can read it.
  // Do not call `app.useBodyParser('json')` here — it would shadow that wiring.

  // OpenAPI / Swagger. Mounted at /api/docs (UI) and /api/docs-json
  // (raw spec for clients, MCP generators, and agent tooling).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hirely API')
    .setDescription(
      'Public HTTP API for the Hirely service. The raw OpenAPI document ' +
        'is available at `/api/docs-json` and is the source of truth for ' +
        'generated clients and agent tooling.',
    )
    .setVersion(process.env.npm_package_version ?? '0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  // Mount Inngest's Express handler at /api/inngest. `app.use()` bypasses
  // Nest's router (and its global prefix), so we include the prefix explicitly.
  app.use(
    '/api/inngest',
    serve({ client: inngest, functions: inngestFunctions }),
  );
}
