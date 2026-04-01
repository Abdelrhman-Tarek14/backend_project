import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { UsersModule } from '../users/users.module';
import { RealtimeDocsController } from './realtime-docs.controller';

@Module({
  imports: [JwtModule, forwardRef(() => UsersModule)],
  providers: [RealtimeGateway],
  controllers: [RealtimeDocsController],
  exports: [RealtimeGateway],
})
export class RealtimeModule { }
