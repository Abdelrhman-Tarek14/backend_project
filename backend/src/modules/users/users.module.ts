import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Exported because AuthModule needs it to validate users
})
export class UsersModule {}
