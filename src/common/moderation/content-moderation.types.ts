import type { ModerationSurface, ModerationTargetType } from '@prisma/client';

export type ModerateContentOptions = {
  surface: ModerationSurface;
  textFields?: string[];
  imageFields?: string[];
};

export type ModerateContentInput = {
  userId?: number | null;
  surface: ModerationSurface;
  targetType?: ModerationTargetType;
  targetId?: number | null;
  requestPath?: string | null;
  texts?: string[];
  imageUrls?: string[];
};
