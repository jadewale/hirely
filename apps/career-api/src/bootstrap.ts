import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseOrigins } from './lib/origins';

/**
 * Apply runtime wiring shared by `main.ts` and end-to-end tests.
 *
 * Anything that must be in place before requests hit the app (global prefix,
 * CORS, OpenAPI) lives here so tests exercise the same surface as production.
 */
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');

  // Enables OnApplicationShutdown hooks so future modules (e.g. the DB pool
  // added in RR-003) can close cleanly on SIGTERM/SIGINT and on app.close().
  app.enableShutdownHooks();

  // CORS for the web client (apps/career-web). The same allowlist will drive
  // Better Auth's trustedOrigins once auth lands, so a cross-origin credentialed
  // fetch that passes CORS is not separately rejected as an untrusted origin.
  const allowedOrigins = parseOrigins(
    process.env.FRONTEND_URL,
    'http://localhost:3100',
  );
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'accept'],
  });

  // OpenAPI / Swagger. Mounted at /api/docs (UI) and /api/docs-json (raw spec
  // for generated clients and agent tooling).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Career Platform API')
    .setDescription(
      'Public HTTP API for the career-platform service. The raw OpenAPI ' +
        'document is available at `/api/docs-json` and is the source of truth ' +
        'for generated clients and agent tooling.',
    )
    .setVersion(process.env.npm_package_version ?? '0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
