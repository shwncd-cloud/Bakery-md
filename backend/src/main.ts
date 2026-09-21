import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_JWT_SECRET = 'change-me-in-production';

function assertProductionSecretsAreSet() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a real secret before running with NODE_ENV=production');
  }
}

async function bootstrap() {
  assertProductionSecretsAreSet();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // CORS_ORIGIN unset (dev default) allows any origin; in production set
  // it to the deployed frontend's exact URL.
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  await app.listen(process.env.PORT ?? 3000);
  Logger.log(`Listening on port ${process.env.PORT ?? 3000}`, 'Bootstrap');
}

bootstrap();
