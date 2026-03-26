/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePigDto {
  @IsString()
  tagNumber!: string; // 👈 add !

  @IsOptional()
  @IsString()
  name?: string;

  @IsIn(['MALE', 'FEMALE'])
  sex!: 'MALE' | 'FEMALE'; // 👈 add !

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
