import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
