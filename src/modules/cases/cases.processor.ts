import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CasesService } from './cases.service';
import { SalesforceWebhookDto } from './dto/salesforce-webhook.dto';
import { CloseCaseWebhookDto } from './dto/close-case-webhook.dto';
import { GasFormWebhookDto } from './dto/gas-form-webhook.dto';

@Processor('webhook-processing-queue')
export class CasesProcessor extends WorkerHost {
  private readonly logger = new Logger(CasesProcessor.name);

  constructor(private readonly casesService: CasesService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing message id: ${job.id} name: ${job.name}`);
    
    try {
      switch (job.name) {
        case 'handleSalesforceWebhook':
          await this.casesService.handleSalesforceWebhook(job.data as SalesforceWebhookDto);
          break;
        case 'handleSalesforceCloseWebhook':
          await this.casesService.handleSalesforceCloseWebhook(job.data as CloseCaseWebhookDto);
          break;
        case 'handleGasFormWebhook':
          await this.casesService.handleGasFormWebhook(job.data as GasFormWebhookDto);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
      this.logger.debug(`Successfully processed job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${(error as Error).message}`, (error as Error).stack);
      throw error; // Throwing the error triggers BullMQ's automatic retry mechanism
    }
  }
}
