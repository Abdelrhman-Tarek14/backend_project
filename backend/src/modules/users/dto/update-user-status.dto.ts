import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: Role, example: Role.AGENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    example: '550e8400-e29b-41d4-a716-446655440000', 
    description: 'UUID of the Team Leader' 
  })
  @IsOptional()
  @IsString()
  @IsUUID() 
  leaderId?: string | null; 
}