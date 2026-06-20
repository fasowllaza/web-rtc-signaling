import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env['PORT'] ?? 8080;

  await app.listen(port);

  Logger.log(`Signaling server running on http://localhost:${port}`);
}

void bootstrap();
