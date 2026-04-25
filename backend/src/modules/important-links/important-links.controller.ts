import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ImportantLinksService } from './important-links.service';
import { UpdateLinkDto, BulkUpdateLinksDto } from './dto/important-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('important-links')
@UseGuards(JwtAuthGuard)
export class ImportantLinksController {
  constructor(private readonly importantLinksService: ImportantLinksService) {}

  @Get()
  findAll() {
    return this.importantLinksService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(@Body() createData: any) {
    return this.importantLinksService.create(createData);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.CMD, Role.SUPERVISOR, Role.LEADER)
  importData(@Body() data: any) {
    return this.importantLinksService.importData(data);
  }

  @Put('bulk-update')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.CMD, Role.SUPERVISOR, Role.LEADER)
  bulkUpdate(@Body() bulkData: BulkUpdateLinksDto) {
    return this.importantLinksService.bulkUpdate(bulkData);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.CMD, Role.SUPERVISOR, Role.LEADER)
  update(@Param('id') id: string, @Body() updateData: UpdateLinkDto) {
    return this.importantLinksService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.CMD, Role.SUPERVISOR, Role.LEADER)
  remove(@Param('id') id: string) {
    return this.importantLinksService.remove(id);
  }
}

