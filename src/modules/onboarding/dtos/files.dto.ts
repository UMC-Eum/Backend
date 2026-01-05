import {IsString, IsIn } from 'class-validator'

export class PresignFileDto {
    @IsString()
    fileName: string;

    @IsString()
    contentType: string;

    @IsIn(['PROFILE_INTRO_AUDIO', 'PROFILE_IMAGE'])
    purpose: string;
}