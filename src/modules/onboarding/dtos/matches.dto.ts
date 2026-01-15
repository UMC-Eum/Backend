import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetRecommendedMatchesQueryDto {
  @ApiPropertyOptional({ example: 20, description: '조회할 매치 개수' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  size?: number;

  @ApiPropertyOptional({ example: 20, description: '최소 나이' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ageMin?: number;

  @ApiPropertyOptional({ example: 50, description: '최대 나이' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ageMax?: number;
}