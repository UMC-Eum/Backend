import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class UserIdealPersonalitiesUpdateRequestDto {
  @ApiProperty({ example: ['차분함', '신중함', '계획성'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayUnique()
  personalityKeywords: string[];
}
