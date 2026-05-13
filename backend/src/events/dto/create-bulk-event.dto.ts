import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateBulkEventDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pigIds?: string[];

  @IsOptional()
  @IsString()
  pigGroupId?: string;

  @IsIn([
    'WEIGHT',
    'VACCINATION',
    'DEWORMING',
    'TRANSPORT',
    'TEETH_CLIPPING',
    'TAIL_DOCKING',
    'CASTRATION',
    'IRON_INJECTION',
    'WEANING',
    'TREATMENT',
    'SALE',
    'NOTE',
  ])
  type!: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

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
}
