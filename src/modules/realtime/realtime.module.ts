import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { UsersModule } from '../users/users.module';
import { RealtimeDocsController } from './realtime-docs.controller';

@Module({
  imports: [JwtModule, UsersModule], // Required for token verification and status updates
  providers: [RealtimeGateway],
  controllers: [RealtimeDocsController], // For Swagger Documentation only
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
