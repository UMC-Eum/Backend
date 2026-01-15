import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class GetRecommendedMatchesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  size?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ageMax?: number;
}
