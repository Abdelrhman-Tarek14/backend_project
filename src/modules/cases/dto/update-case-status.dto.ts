import { IsEnum, IsNotEmpty } from 'class-validator';
import { AssignmentStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: AssignmentStatus, example: AssignmentStatus.OPEN, description: 'New status for the assignment' })
  @IsNotEmpty()
  @IsEnum(AssignmentStatus, { message: 'Status must be a valid AssignmentStatus (OPEN, CLOSED)' })
  status: AssignmentStatus;
}
