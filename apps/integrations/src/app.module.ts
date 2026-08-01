import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { ConfigModule } from './config/config.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    ConfigModule,
    HealthModule,
    InternalModule,
  ],
})
export class AppModule {}
