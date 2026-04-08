import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEtaDto {
  @ApiProperty({ example: 45, description: 'Estimated time in minutes to resolve the case' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  etaMinutes: number;
}
