import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GasEvaluationWebhookDto {
  @ApiProperty({ example: '12345678', description: 'Unique case number' })
  @IsString()
  @IsNotEmpty()
  caseNumber: string;

  @ApiProperty({ example: 'agent@example.com', description: 'Agent assigned to the case' })
  @IsEmail()
  @IsNotEmpty()
  caseOwner: string;

  @ApiPropertyOptional({ example: '2023-10-25T10:00:00Z', description: 'Evaluation Time' })
  @IsOptional()
  @IsString()
  evaluationTime?: string;

  @ApiPropertyOptional({ example: true, description: 'Quality Score (passed = true)' })
  @IsOptional()
  @IsBoolean()
  qualityScore?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Final Check Score (passed = true)' })
  @IsOptional()
  @IsBoolean()
  finalCheckScore?: boolean;
}
