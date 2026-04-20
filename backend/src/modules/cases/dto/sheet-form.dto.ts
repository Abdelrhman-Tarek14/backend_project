import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SheetFormDto {
  @ApiProperty({ example: '12345678', description: 'Unique Salesforce case number' })
  @IsString()
  @IsNotEmpty()
  caseNumber: string;

  @ApiProperty({ example: 'agent@example.com', description: 'Agent assigned to the case' })
  @IsEmail()
  @IsNotEmpty()
  caseOwner: string;

  @ApiPropertyOptional({ example: 'TypeA', description: 'Form Type' })
  @IsOptional()
  @IsString()
  formType?: string;

  @ApiPropertyOptional({ example: '2026-03-30T14:30:00Z', description: 'Submission Time' })
  @IsOptional()
  @IsDateString()
  formSubmitTime?: string;

  @ApiPropertyOptional({ example: 5, description: 'Number of items' })
  @IsOptional()
  @IsInt()
  @Min(0)
  items?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of choices' })
  @IsOptional()
  @IsInt()
  @Min(0)
  choices?: number;

  @ApiPropertyOptional({ example: 10, description: 'Description evaluation score' })
  @IsOptional()
  @IsInt()
  @Min(0)
  description?: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of images' })
  @IsOptional()
  @IsInt()
  @Min(0)
  images?: number;

  @ApiPropertyOptional({ example: 4, description: 'Number of TMP areas' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tmpAreas?: number;

  @ApiPropertyOptional({ example: 'valid', description: 'Form validation result' })
  @IsOptional()
  @IsString()
  formValidation?: string;

  @ApiPropertyOptional({ example: 45, description: 'ETA in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  eta?: number;
}
