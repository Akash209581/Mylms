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
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://lms-0-id5t.onrender.com',
  ].filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow no origin (like Postman or local curl)
      if (!origin) {
        return callback(null, true);
      }
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /\.onrender\.com$/.test(origin);

      if (isAllowed) {
        console.log(`CORS: Allowed origin -> ${origin}`);
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked origin -> ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`LMS Backend running on port ${port}`);
}
bootstrap();