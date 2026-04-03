import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCasesDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: AssignmentStatus, description: 'Filter by assignment status' })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @ApiPropertyOptional({ example: '2026-03-29', description: 'Filter by creation date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'uuid-agent-123', description: 'Filter by assigned agent ID. (Management only, Agents are forced to their own ID)' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ example: 'agent@test.com', description: 'Filter by agent email. (Management only, Agents are forced to their own ID)' })
  @IsOptional()
  @IsString()
  agentEmail?: string;

  @ApiPropertyOptional({ example: 'Ahmed', description: 'Filter by agent name. (Management only, Agents are forced to their own ID)' })
  @IsOptional()
  @IsString()
  agentName?: string;
}
