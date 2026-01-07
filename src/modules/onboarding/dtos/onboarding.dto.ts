import {
    IsString,
    IsArray,
    IsDateString,
    IsNumber,
  } from 'class-validator';
  
  export class CreateProfileDto {
    @IsString()
    nickname: string;
  
    @IsString()
    gender: string;
  
    @IsDateString()
    birthDate: string;
  
    @IsString()
    areaCode: string;
  
    @IsString()
    introText: string;
  
    @IsString()
    introAudioUrl: string;
  
    @IsArray()
    @IsString({ each: true })
    selectedKeywords: string[];
  
    @IsArray()
    @IsNumber({}, { each: true })
    vibeVector: number[];
  }
  