import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const appEnv = process.env.APP_ENV || 'development';
  if (appEnv !== 'development' && !process.env.INTEGRATIONS_API_KEY) {
    throw new Error('INTEGRATIONS_API_KEY is required when APP_ENV is not development');
  }

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = config.corsOrigins;
  if (origins.length > 0) {
    app.enableCors({ origin: origins });
  }

  const port = config.port;
  await app.listen(port);
  console.log(`Integrations service running on port ${port}`);
}
bootstrap();
