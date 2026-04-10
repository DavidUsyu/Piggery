/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePigDto {
  @IsOptional()
  @IsString()
  tagNumber?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  sex?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  sireId?: string;

  @IsOptional()
  @IsString()
  damId?: string;
}