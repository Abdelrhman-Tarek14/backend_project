import { IsEnum, IsOptional, IsString, IsInt, IsDateString, IsEmail, IsUUID } from 'class-validator';
import { AssignmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAssignmentDto {
  @ApiPropertyOptional({ enum: AssignmentStatus, example: AssignmentStatus.OPEN, description: 'New status for the assignment' })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @ApiPropertyOptional({ example: 'Menu Typing', description: 'Manual update of case type' })
  @IsOptional()
  @IsString()
  caseType?: string;

  @ApiPropertyOptional({ example: 'Full Form', description: 'Manual update of form type' })
  @IsOptional()
  @IsString()
  formType?: string;

  @ApiPropertyOptional({ example: '2026-03-30T10:00:00Z', description: 'Manual start time update' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-03-30T18:00:00Z', description: 'Manual closure time update' })
  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @ApiPropertyOptional({ example: 60, description: 'Manual ETA update (minutes)' })
  @IsOptional()
  @IsInt()
  etaMinutes?: number;

  @ApiPropertyOptional({ example: 'agent-uuid-here', description: 'Manually reassign to another user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'new-owner@example.com', description: 'Manual owner email update' })
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;
}
