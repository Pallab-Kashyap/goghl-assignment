import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/better-auth';

async function bootstrap() {
  console.log('Starting NestJS bootstrap...');
  const app = await NestFactory.create(AppModule);
  console.log('NestJS app created');

  // Get the underlying Express instance
  const expressApp = app.getHttpAdapter().getInstance();

  // Better-auth middleware - must be added to Express directly BEFORE NestJS middleware
  const betterAuthHandler = toNodeHandler(auth);
  expressApp.use((req: any, res: any, next: any) => {
    const betterAuthPaths = [
      '/api/auth/sign-in',
      '/api/auth/callback',
      '/api/auth/session',
      '/api/auth/sign-out',
    ];

    // Check if the request path starts with any of the better-auth paths
    const isBetterAuthRoute = betterAuthPaths.some((p) =>
      req.url.startsWith(p),
    );

    if (isBetterAuthRoute) {
      console.log('Better-auth handling:', req.method, req.url);
      return betterAuthHandler(req, res);
    }

    next();
  });

  // Enable cookie parsing
  app.use(cookieParser());

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter for error logging
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Personal Finance Management API')
    .setDescription(
      'API for managing personal finances including transactions, categories, and budgets. Supports JWT authentication with access/refresh tokens.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addCookieAuth('accessToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'accessToken',
    })
    .addTag('Auth', 'Authentication endpoints')
    .addTag('User', 'User profile endpoints')
    .addTag('Categories', 'Category management endpoints')
    .addTag('Transactions', 'Transaction management endpoints')
    .addTag('Budgets', 'Budget management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/doc`);
}
void bootstrap();
