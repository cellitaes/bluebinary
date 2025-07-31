import { NestFactory } from '@nestjs/core';
import * as express from 'express';

import { AppModule } from './app.module';
import { CustomLoggerService } from './common/services/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(CustomLoggerService);
  app.useLogger(logger);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb' }));

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
