import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3001');

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS — allow admin frontend (production, Vercel previews, local)
  const allowedOrigins = [
    frontendUrl,
    'https://admin.thefamgroup.uk',
    'https://admin-l3hf5qagg-thefamgroup-s-projects.vercel.app',
    'http://localhost:3001',
  ].filter(Boolean)

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: ${origin} not allowed`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix & versioning
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform primitives
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger (dev only)
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('thefamgroup Admin API')
      .setDescription('Back-office API for thefamgroup cleaning business')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication')
      .addTag('dashboard', 'Dashboard stats')
      .addTag('bookings', 'Booking management')
      .addTag('quotes', 'Quotes & invoices')
      .addTag('leads', 'Lead pipeline')
      .addTag('inbox', 'Unified inbox')
      .addTag('team', 'Team management')
      .addTag('settings', 'App settings')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`📄 Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`🚀 API running at http://localhost:${port}/api`);
}

bootstrap();
