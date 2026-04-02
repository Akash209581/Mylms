import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  
  // Increase payload size limit for base64 images
  const express = require('express');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      console.log(`📡 Incoming request from origin: ${origin}`);
      if (
        !origin ||
        allowedOrigins.some((ao) => origin.startsWith(ao as string)) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        origin.includes('.onrender.com')
      ) {
        callback(null, true);
      } else {
        console.error(`❌ Origin NOT allowed: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 LMS Backend running on port ${port}`);
}
bootstrap();
