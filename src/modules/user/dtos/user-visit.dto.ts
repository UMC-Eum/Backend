import { Sex } from '@prisma/client';

export interface UserVisitMarkResponseDto {
  watchLogId: number;
  visitedTo: number;
  visitedBy: number;
  visitedAt: string;
}

export interface VisitorItemDto {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  age: number;
  sex: Sex;
  introText: string | null;
  visitedAt: string;
}
