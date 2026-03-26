import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePigStatusDto {
  @IsIn(['SOLD', 'DEAD', 'CONSUMED'])
  status!: 'SOLD' | 'DEAD' | 'CONSUMED';

  @IsOptional()
  @IsString()
  notes?: string;
}
