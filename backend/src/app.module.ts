import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { CasesModule } from './modules/cases/cases.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import configuration from './config/configuration';
import { validate } from './common/validation/env.validation';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SystemModule } from './modules/system/system.module';
import { MaintenanceGuard } from './common/guards/maintenance.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.development',
        '.env',
      ],
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
      {
        name: 'webhook',
        ttl: 60000,
        limit: 300,
      },
    ]),
    PrismaModule,
    UsersModule,
    CasesModule,
    AuthModule,
    RealtimeModule,
    LeaderboardModule,
    EventEmitterModule.forRoot(),
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule { }