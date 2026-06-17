import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './websocket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup clustered Redis WebSocket adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_URL || '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('CBT API')
    .setDescription('Computer Based Testing - REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT || 3001);
  console.log(`CBT API running on port ${process.env.PORT || 3001}`);
}
bootstrap();
