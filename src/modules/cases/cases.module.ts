import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { CasesProcessor } from './cases.processor';

@Module({
  imports: [
    RealtimeModule,
    BullModule.registerQueue({
      name: 'webhook-processing-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  providers: [CasesService, CasesProcessor],
  controllers: [CasesController],
})
export class CasesModule {}

