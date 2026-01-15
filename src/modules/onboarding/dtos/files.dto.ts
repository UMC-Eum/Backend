import {IsString, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger';
export class PresignFileDto {
    @ApiProperty({example: 'intro.m4a'})
    @IsString()
    fileName: string;

    @ApiProperty({ example: 'audio/mp4' })
    @IsString()
    contentType: string;

    @ApiProperty({ enum: ['PROFILE_INTRO_AUDIO', 'PROFILE_IMAGE'] })
    @IsIn(['PROFILE_INTRO_AUDIO', 'PROFILE_IMAGE'])
    purpose: string;
}