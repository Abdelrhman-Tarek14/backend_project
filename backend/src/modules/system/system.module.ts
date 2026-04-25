import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => RealtimeModule),
    forwardRef(() => AuthModule),
    JwtModule,
  ],
  providers: [SystemService],
  controllers: [SystemController],
  exports: [SystemService],
})
export class SystemModule {}
