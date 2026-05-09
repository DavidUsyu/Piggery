/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  pigId!: string;

  @IsIn([
    'WEIGHT',
    'VACCINATION',
    'DEWORMING',
    'TEETH_CLIPPING',
    'TAIL_DOCKING',
    'CASTRATION',
    'IRON_INJECTION',
    'BREEDING',
    'PREGNANCY_CHECK',
    'FARROWING',
    'WEANING',
    'ILLNESS',
    'TREATMENT',
    'SALE',
    'DEATH',
    'CONSUMED',
    'NOTE',
  ])
  type!: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsString()
  medicine?: string;

  @IsOptional()
  @IsString()
  dose?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  boarId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pigletsBorn?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stillBorn?: number;

  @IsOptional()
  @IsIn(['PREGNANT', 'RETURNED_TO_HEAT'])
  pregnancyCheckResult?: string;
}
