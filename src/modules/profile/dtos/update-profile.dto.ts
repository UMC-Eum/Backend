import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  introText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  idealVoiceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  introVoiceUrl?: string;
}
