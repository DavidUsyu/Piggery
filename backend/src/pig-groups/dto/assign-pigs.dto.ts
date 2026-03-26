import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AssignPigsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  pigIds!: string[];
}