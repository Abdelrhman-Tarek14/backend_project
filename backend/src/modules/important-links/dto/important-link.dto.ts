import { IsString, IsBoolean, IsOptional, ValidateNested, IsObject, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLinkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;

  @IsBoolean()
  @IsOptional()
  is_multi_country?: boolean;

  @IsString()
  @IsOptional()
  url?: string;

  @IsObject()
  @IsOptional()
  urls?: Record<string, string>;
}

export class BulkUpdateLinkItemDto extends UpdateLinkDto {
  @IsString()
  id: string;
}

export class BulkUpdateLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateLinkItemDto)
  links: BulkUpdateLinkItemDto[];
}
