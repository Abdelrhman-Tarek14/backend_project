import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GasFormWebhookDto {
  @ApiProperty({ example: '12345678', description: 'Unique Salesforce case number' })
  @IsString()
  @IsNotEmpty()
  caseNumber: string;

  @ApiProperty({ example: 'agent@example.com', description: 'Agent email for assignment lookup' })
  @IsEmail()
  @IsNotEmpty()
  caseOwner: string;

  @ApiProperty({ example: 'Menu Typing', description: 'Type of form submitted' })
  @IsString()
  @IsOptional()
  formType?: string;

  @ApiProperty({ example: 45, description: 'Estimated time in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  caseETA?: number;

  @ApiProperty({ example: '2026-03-30T14:30:00Z', description: 'Submission time in ISO 8601 format' })
  @IsString()
  @IsOptional()
  formSubmitTime?: string;
}
