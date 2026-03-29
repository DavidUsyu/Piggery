/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  pigId?: string;

  @IsIn([
    'FEED',
    'MEDICINE',
    'TRANSPORT',
    'LABOR',
    'BREEDING',
    'UTILITIES',
    'MAINTENANCE',
    'PURCHASE',
    'OTHER',
  ])
  category!:
    | 'FEED'
    | 'MEDICINE'
    | 'TRANSPORT'
    | 'LABOR'
    | 'BREEDING'
    | 'UTILITIES'
    | 'MAINTENANCE'
    | 'PURCHASE'
    | 'OTHER';

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  vendor?: string;
}