import type { ClubListItemDto } from '../dtos/club.dto';
import type { ClubListRow } from '../repositories/club.repository';

export function toClubListItemDto(row: ClubListRow): ClubListItemDto {
  return {
    clubId: row.id.toString(),
    name: row.name,
    introText: row.introText,
    category: row.category,
    thumbnailUrl: row.thumbnailUrl,
    likes: row.likes,
    memberCount: row._count.clubUsers,
    keywords: row.clubKeywords.map((keyword) => keyword.personality.body),
    createdAt: row.createdAt.toISOString(),
  };
}
