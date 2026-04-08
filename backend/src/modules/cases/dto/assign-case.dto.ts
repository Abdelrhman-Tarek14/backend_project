import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignCaseDto {
  @ApiProperty({ example: 'uuid-agent-123', description: 'ID of the agent to assign the case to' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  agentId: string;
}
