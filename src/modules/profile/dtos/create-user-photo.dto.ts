import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserPhotoDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  url: string;
}
