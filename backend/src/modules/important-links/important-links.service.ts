import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateLinkDto, BulkUpdateLinksDto } from './dto/important-link.dto';
import { LinkCategory } from '@prisma/client';

@Injectable()
export class ImportantLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const links = await this.prisma.importantLink.findMany();
    
    // Grouping logic to match the frontend's expected JSON format
    const resources: Record<string, Record<string, any>> = {
      forms: {},
      sheets: {},
      websites: {},
      drive: {},
    };

    links.forEach((link) => {
      const categoryKey = link.category.toLowerCase();
      if (!resources[categoryKey]) {
        resources[categoryKey] = {};
      }

      resources[categoryKey][link.key] = {
        id: link.id,
        key: link.key,
        category: link.category,
        title: link.title,
        is_available: link.isAvailable,
        ...(link.isMultiCountry
          ? {
              is_multi_country: link.isMultiCountry,
              urls: link.urls || {},
            }
          : {
              url: link.url,
            }),
      };
    });

    return { resources };
  }

  async create(createData: any) {
    return this.prisma.importantLink.create({
      data: {
        key: createData.key,
        title: createData.title,
        category: createData.category,
        isAvailable: createData.is_available ?? true,
        isMultiCountry: createData.is_multi_country ?? false,
        url: createData.url,
        urls: createData.urls ? (createData.urls as any) : undefined,
      },
    });
  }

  async update(id: string, updateData: UpdateLinkDto) {
    const link = await this.prisma.importantLink.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException(`Link with ID ${id} not found`);
    }

    return this.prisma.importantLink.update({
      where: { id },
      data: {
        title: updateData.title,
        isAvailable: updateData.is_available,
        isMultiCountry: updateData.is_multi_country,
        url: updateData.url,
        urls: updateData.urls ? (updateData.urls as any) : undefined,
      },
    });
  }

  async bulkUpdate(bulkData: BulkUpdateLinksDto) {
    const operations = bulkData.links.map((linkUpdate) =>
      this.prisma.importantLink.update({
        where: { id: linkUpdate.id },
        data: {
          title: linkUpdate.title,
          isAvailable: linkUpdate.is_available,
          isMultiCountry: linkUpdate.is_multi_country,
          url: linkUpdate.url,
          urls: linkUpdate.urls ? (linkUpdate.urls as any) : undefined,
        },
      })
    );

    await this.prisma.$transaction(operations);
    return { message: `${operations.length} links updated successfully` };
  }

  async remove(id: string) {
    try {
      await this.prisma.importantLink.delete({ where: { id } });
      return { message: 'Link deleted successfully' };
    } catch (error) {
      throw new NotFoundException(`Link with ID ${id} not found`);
    }
  }

  async importData(data: any) {
    if (!data || !data.resources) {
      throw new BadRequestException('Invalid data format. Expected {"resources": {...}}');
    }

    const categoriesMap: Record<string, LinkCategory> = {
      forms: LinkCategory.FORMS,
      sheets: LinkCategory.SHEETS,
      websites: LinkCategory.WEBSITES,
      drive: LinkCategory.DRIVE,
    };

    const operations = [];
    let count = 0;

    for (const [catName, items] of Object.entries(data.resources)) {
      const categoryEnum = categoriesMap[catName.toLowerCase()];
      if (!categoryEnum) continue;

      for (const [key, details] of Object.entries(items as Record<string, any>)) {
        operations.push(
          this.prisma.importantLink.upsert({
            where: { key },
            update: {
              title: details.title,
              isAvailable: details.is_available ?? true,
              isMultiCountry: details.is_multi_country ?? false,
              url: details.url,
              urls: details.urls ? (details.urls as any) : undefined,
              category: categoryEnum,
            },
            create: {
              key,
              title: details.title,
              isAvailable: details.is_available ?? true,
              isMultiCountry: details.is_multi_country ?? false,
              url: details.url,
              urls: details.urls ? (details.urls as any) : undefined,
              category: categoryEnum,
            },
          })
        );
        count++;
      }
    }

    await this.prisma.$transaction(operations);
    return { message: `Successfully imported ${count} links` };
  }
}

