import { IsOptional, IsString } from 'class-validator';

export class CreateFeedTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;
}