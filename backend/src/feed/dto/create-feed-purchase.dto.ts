import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFeedPurchaseDto {
  @IsString()
  feedTypeId: string;

  @IsNumber()
  @Min(0.01)
  quantityBought: number;

  @IsNumber()
  @Min(0)
  totalCost: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}