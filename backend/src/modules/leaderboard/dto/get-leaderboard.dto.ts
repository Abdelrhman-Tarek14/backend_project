import { IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetLeaderboardDto {
  @ApiPropertyOptional({ description: 'Start date (ISO format). Defaults to start of current month.' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format). Defaults to current time.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by leader ID' })
  @IsOptional()
  @IsString()
  leaderId?: string;

  @ApiPropertyOptional({ description: 'Partial search by leader name' })
  @IsOptional()
  @IsString()
  leaderName?: string;

  @ApiPropertyOptional({ description: 'Partial search by email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Partial search by name' })
  @IsOptional()
  @IsString()
  name?: string;
}
