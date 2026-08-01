import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { assertIntegrationsApiKeyConfigured } from './config/require-api-key';

async function bootstrap() {
  assertIntegrationsApiKeyConfigured();

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
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
