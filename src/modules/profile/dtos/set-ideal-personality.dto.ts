import { IsArray, ArrayNotEmpty, ArrayUnique, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SetIdealPersonalityDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  personalityIds: number[];
}
