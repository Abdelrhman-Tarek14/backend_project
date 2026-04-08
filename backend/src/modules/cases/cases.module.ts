import { Module } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CasesWebhookService } from './cases-webhook.service';
import { CasesController } from './cases.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    RealtimeModule,
  ],
  providers: [CasesService, CasesWebhookService],
  controllers: [CasesController],
  exports: [CasesService, CasesWebhookService],
})
export class CasesModule { }