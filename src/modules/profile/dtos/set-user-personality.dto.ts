import { IsArray, ArrayNotEmpty, ArrayUnique, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SetUserPersonalityDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  personalityIds: number[];
}
