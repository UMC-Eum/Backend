import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportCategory } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export interface ReportDto {
  targetUserId: number;
  reason: string;
}

export class CreateReportRequestDto {
  @ApiProperty({
    enum: ReportCategory,
    example: ReportCategory.SPAM,
    description: '신고 유형 코드',
  })
  @IsEnum(ReportCategory)
  category!: ReportCategory;

  @ApiProperty({
    example: '스팸성 홍보 내용이 반복적으로 게시됩니다.',
    description: '신고 상세 사유',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason!: string;
}

export class CreateUserReportRequestDto extends CreateReportRequestDto {
  @ApiProperty({
    example: '40',
    description: '신고 대상 사용자 ID',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @ApiPropertyOptional({
    example: '123',
    description: '관련된 채팅방 ID',
  })
  @IsOptional()
  @IsString()
  chatRoomId?: string;
}

export class ReportCreatedResponseDto {
  @ApiProperty({ example: 123 })
  reportId!: number;

  @ApiProperty({ enum: ReportCategory, example: ReportCategory.SPAM })
  category!: ReportCategory;

  @ApiProperty({ example: '스팸성 홍보 내용이 반복적으로 게시됩니다.' })
  reason!: string;

  @ApiPropertyOptional({ example: 12 })
  clubId?: number;

  @ApiPropertyOptional({ example: 345 })
  articleId?: number;
}

export interface ReportResponseDto {
  reportId: number;
  category: string;
  reason: string;
  chatRoomId: number;
}
/*
{
  "targetUserId": 9,
  "category": "HARASSMENT",
  "description": "사유 상세",
  "evidenceMessageId": 9001
}*/
