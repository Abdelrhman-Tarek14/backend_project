import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ImportantLinksController } from './important-links.controller';
import { ImportantLinksService } from './important-links.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImportantLinksController],
  providers: [ImportantLinksService]
})
export class ImportantLinksModule {}
