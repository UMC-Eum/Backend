import { Injectable } from '@nestjs/common';
import {
  ClubListSort,
  ListClubsQueryDto,
  ListClubsResponseDto,
} from '../../dtos/club.dto';
import { ClubRepository } from '../../repositories/club.repository';
import {
  decodeClubCursor,
  encodeClubCursor,
} from '../../utils/club-cursor.util';
import { toClubListItemDto } from '../../utils/club.mapper';

@Injectable()
export class ClubService {
  constructor(private readonly clubRepository: ClubRepository) {}

  async listClubs(query: ListClubsQueryDto): Promise<ListClubsResponseDto> {
    const sort = query.sort ?? ClubListSort.POPULAR;
    const limit = query.limit ?? 20;
    const cursor = query.cursor
      ? decodeClubCursor(query.cursor, sort)
      : undefined;

    const rows = await this.clubRepository.findManyForList({
      keyword: query.keyword?.trim() || undefined,
      category: query.category,
      sort,
      cursor,
      limit,
    });

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext
      ? encodeClubCursor(page[page.length - 1], sort)
      : null;

    return {
      nextCursor,
      items: page.map((row) => toClubListItemDto(row)),
    };
  }
}
