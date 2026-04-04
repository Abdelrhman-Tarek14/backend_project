import { IsString, IsNotEmpty, IsOptional, IsEmail, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SalesforceWebhookDto {
  @ApiProperty({ example: '12345678', description: 'Unique Salesforce case number' })
  @IsString()
  @IsNotEmpty()
  caseNumber: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Customer account name' })
  @IsString()
  @IsOptional()
  caseAccountName?: string;

  @ApiProperty({ example: 'USA', description: 'Country of the account' })
  @IsString()
  @IsOptional()
  caseCountry?: string;

  @ApiProperty({ example: 'Menu Typing', description: 'Type of the case' })
  @IsString()
  @IsOptional()
  caseType?: string;

  @ApiProperty({ example: 'agent@example.com', description: 'Email of the case owner' })
  @IsEmail()
  @IsOptional()
  caseOwner?: string;

  @ApiProperty({ example: '2026-03-30T14:00:00Z', description: 'Start time in ISO 8601 format' })
  @IsISO8601()
  @IsOptional()
  caseStartTime?: string;
}
