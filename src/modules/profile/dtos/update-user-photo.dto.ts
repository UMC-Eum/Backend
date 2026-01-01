import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserPhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  url?: string;
}
