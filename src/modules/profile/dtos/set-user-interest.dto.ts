import { IsArray, ArrayNotEmpty, ArrayUnique, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SetUserInterestDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  interestIds: number[];
}

