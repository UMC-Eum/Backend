export type ModerationSurface =
  | 'ARTICLE'
  | 'COMMENT'
  | 'USER_PROFILE'
  | 'CLUB'
  | 'CHAT';

export type ModerateContentOptions = {
  surface: ModerationSurface;
  textFields?: string[];
  imageFields?: string[];
};

export type ModerateContentInput = {
  userId?: number | null;
  surface: ModerationSurface;
  texts?: string[];
  imageUrls?: string[];
};
