import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: Role, example: Role.AGENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
