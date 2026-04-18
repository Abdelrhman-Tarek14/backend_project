import { Module, forwardRef } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  providers: [SystemService],
  controllers: [SystemController],
  exports: [SystemService],
})
export class SystemModule {}
