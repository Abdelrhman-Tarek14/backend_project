import 'source-map-support/register';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { winstonConfig } from './common/logger/winston.config';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { initializeDoubleCsrf } from './common/utils/csrf.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
    rawBody: true,
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('nodeEnv') === 'production';

  app.enableCors({
    origin: configService.get('corsOrigin'),
    credentials: true,
  });

  // ── Security Headers (Helmet) ──────────────────────────────────────────────
  if (isProduction) {
    app.use(helmet());
  } else {
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  }

  // Enable trust proxy for accurate client IP identification (behind Nginx, Cloudflare, etc.)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Cookie Parsing for HTTP-only tokens
  app.use(cookieParser());

  // ── CSRF Protection using Double Submit Cookie pattern ───────────────────
  const { doubleCsrfProtection } = initializeDoubleCsrf(configService);

  // Apply CSRF globally but skip for webhook routes (they use API key auth)
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/cases/webhook')) {
      return next();
    }
    doubleCsrfProtection(req, res, next);
  });

  // Global validation 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global error filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global serialization for excluding sensitive fields
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger Documentation
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('TermHub API')
      .setDescription(`
      The TermHub Internal ETA Management System API.

      ## Authentication Flow
      1. Call \`GET /csrf\` to obtain a CSRF token.
      2. Include it in the \`x-csrf-token\` header for all state-changing requests (POST, PATCH, DELETE).
      3. Login via \`POST /auth/google \` or \`POST /auth/login\`.

      > **Note:** Webhook endpoints (\`/cases/webhook/*\`) are exempt from CSRF protection and use API key authentication instead.

      For real-time data streaming and event documentation, please refer to the Realtime (WebSockets) section at the bottom of this page.
    `)
      .setVersion('1.0')
      .addTag('Auth')
      .addTag('Cases')
      .addTag('Users')
      .addTag('System')
      .addTag('Leaderboard')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-csrf-token', in: 'header' }, 'CsrfToken')
      .addApiKey({ type: 'apiKey', name: 'x-sf-api-key', in: 'header' }, 'SfApiKey')
      .addApiKey({ type: 'apiKey', name: 'x-gas-api-key', in: 'header' }, 'GasApiKey')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document
      //   , {
      //   customfavIcon: 'logo.ico', 
      //   customCss: `
      //     .topbar { display: none !important; } 
      //     body { background-color: #1e1e1e !important; }
      //     .swagger-ui .info .title { color: #ff5722 !important; }
      //     .swagger-ui .info p { color: #dddddd !important; }
      //   `,
      // }
    );
  }
  await app.listen(configService.get<number>('port') ?? 3000, '0.0.0.0');
}
bootstrap();