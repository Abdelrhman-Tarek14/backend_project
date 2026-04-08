import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCaseDto {
  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Update account name' })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({ example: 'Egypt', description: 'Update country' })
  @IsString()
  @IsOptional()
  country?: string;
}
