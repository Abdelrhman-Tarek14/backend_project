import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { winstonConfig } from './common/logger/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
    rawBody: true,
  });

  // Cookie Parsing for HTTP-only tokens
  app.use(cookieParser());

  // CORS config to support withCredentials: true
  app.enableCors({
    origin: true, // In production, replace with specific domain
    credentials: true,
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

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('TermHub API')
    .setDescription(`
      The TermHub Internal ETA Management System API.
      
      For real-time data streaming and event documentation, please refer to the Realtime (WebSockets) section at the bottom of this page.
    `)
    .setVersion('1.0')
    .addTag('Auth')
    .addTag('Cases')
    .addTag('Users')
    .addTag('System')
    .addBearerAuth()
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
