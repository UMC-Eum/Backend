import { SetMetadata } from '@nestjs/common';
import type { ModerateContentOptions } from './content-moderation.types';

export const MODERATE_CONTENT_METADATA = 'moderate_content_options';

export function ModerateContent(options: ModerateContentOptions) {
  return SetMetadata(MODERATE_CONTENT_METADATA, options);
}
