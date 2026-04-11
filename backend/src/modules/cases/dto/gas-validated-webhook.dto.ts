import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GasValidatedWebhookDto {
  @ApiProperty({ example: '12345678', description: 'Unique case number' })
  @IsString()
  @IsNotEmpty()
  caseNumber: string;

  @ApiProperty({ example: 'agent@example.com', description: 'Agent assigned to the case' })
  @IsEmail()
  @IsNotEmpty()
  caseOwner: string;

  @ApiPropertyOptional({ example: 'TypeA', description: 'Form Type from GAS' })
  @IsOptional()
  @IsString()
  formType?: string;

  @ApiPropertyOptional({ example: '2023-10-25T10:00:00Z', description: 'Submission Time' })
  @IsOptional()
  @IsDateString()
  formSubmitTime?: string;

  @ApiPropertyOptional({ example: 5, description: 'Number of items' })
  @IsOptional()
  @IsInt()
  items?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of choices' })
  @IsOptional()
  @IsInt()
  choices?: number;

  @ApiPropertyOptional({ example: 10, description: 'Description evaluation' })
  @IsOptional()
  @IsInt()
  description?: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of images' })
  @IsOptional()
  @IsInt()
  images?: number;

  @ApiPropertyOptional({ example: 4, description: 'Number of TMP areas' })
  @IsOptional()
  @IsInt()
  tmpAreas?: number;

  @ApiPropertyOptional({ example: 'valid', description: 'Form validation result: valid, invalid, or amened' })
  @IsOptional()
  @IsString()
  formValidation?: string;

  @ApiPropertyOptional({ example: true, description: 'Is the form on time' })
  @IsOptional()
  @IsBoolean()
  isOnTime?: boolean;

  @ApiPropertyOptional({ example: 45, description: 'ETA in minutes' })
  @IsOptional()
  @IsInt()
  eta?: number;
}

