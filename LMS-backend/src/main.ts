import { trustedOrigins, protectMutationOrigin } from './common/request-origin';
import { ResponsePrivacyInterceptor } from './common/response-privacy.interceptor';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
const cookieParser = require('cookie-parser');
async function bootstrap() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is missing. Add it in .env before starting LMS-backend.');
  }
  try {
    const host = new URL(dbUrl).host;
    const mode = dbUrl.includes('-pooler') ? 'neon-pooler' : 'direct-or-local';
    console.log(`[DB] Startup target host=${host}, mode=${mode}`);
  } catch {
    console.warn('[DB] DATABASE_URL is not a valid URL. Connection may fail at startup.');
  }
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // Increase payload size limit for base64 images
  const express = require('express');
  const path = require('path');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const allowedOrigins = trustedOrigins();
  app.use(protectMutationOrigin(allowedOrigins));
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  });
  app.useGlobalInterceptors(new ResponsePrivacyInterceptor());
  // Use UPLOADS_DIR env var for persistent disk support on Render
  // Set UPLOADS_DIR=/var/data/uploads in Render environment to use persistent disk
  const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
  const fs = require('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadsDir}`);
  }
  console.log(`📁 Serving uploads from: ${uploadsDir}`);

  app.use(
    '/uploads',
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`LMS Backend running on port ${port}`);
}
bootstrap();
 
