import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { envValidationSchema } from './common/validation/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ConfigService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule { }