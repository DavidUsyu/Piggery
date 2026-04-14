import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFeedUsageDto {
  @IsString()
  feedTypeId: string;

  @IsNumber()
  @Min(0.01)
  quantityUsed: number;

  @IsOptional()
  @IsDateString()
  usageDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}