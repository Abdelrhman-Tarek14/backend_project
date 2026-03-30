import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseCaseWebhookDto {
  @ApiProperty({ example: '12345678', description: 'Unique Salesforce case number' })
  @IsString()
  @IsNotEmpty()
  caseNumber: string;

  @ApiProperty({ example: 'agent@example.com', description: 'Email of the case owner to close' })
  @IsEmail()
  @IsNotEmpty()
  caseOwner: string;
}
