import {
  DayOfWeek,
  Prisma,
  PrismaClient,
  RecurrenceType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type AddressCsv = {
  code: string;
  sidoCode: string;
  sigunguCode: string;
  emdCode: string;
  riCode: string;
  sidoName: string;
  sigunguName?: string;
  emdName?: string;
  riName?: string;
  fullName: string;
  level: string;
  parentCode?: string;
};

type KeywordCsv = {
  id: string;
  body: string;
};

type SeedUserCsv = {
  id: string;
  birthdate: string;
  age: string;
  email: string;
  sex: string;
  nickname: string;
  introVoiceUrl: string;
  introText: string;
  profileImageUrl: string;
  status: string;
  code: string;
  provider: string;
  providerUserId: string;
  vibeSeed: string;
};

type SeedClubCsv = {
  id: string;
  hostId: string;
  name: string;
  introVoiceUrl: string;
  introText: string;
  category: string;
  capacity: string;
  code: string;
  likes: string;
  thumbnailUrl: string;
  vibeSeed: string;
};

type SeedClubUserCsv = {
  id: string;
  userId: string;
  clubId: string;
  authority: string;
  status: string;
  joinMessage: string;
};

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'prisma', 'data');
const DUMMY_COUNT = 24;
const REPORT_COUNT = DUMMY_COUNT * 2;
const ADDRESS_CHUNK_SIZE = 5_000;
const now = new Date('2026-01-10T09:00:00.000Z');
const BADGE_NAMES = [
  '첫 모임 참여',
  '꾸준한 참석',
  '친절한 이웃',
  '모임 운영자',
  '대화 메이트',
  '건강 챙김',
  '문화 탐방가',
  '사진 기록가',
  '맛집 안내자',
  '봉사 실천가',
  '독서 친구',
  '음악 애호가',
  '산책 동행',
  '운동 파트너',
  '여행 기획자',
  '식물 돌봄이',
  '바둑 친구',
  '재테크 학습자',
  '손글씨 연습가',
  '멘토링 참여자',
  '전시 동행',
  '요리 나눔',
  '한강 라이더',
  '동네 역사꾼',
] as const;
const ARTICLE_SEEDS = [
  {
    title: '이번 주 한강 산책 코스 안내',
    contents:
      '토요일 오전 9시에 흑석역 3번 출구에서 모여 한강 방향으로 천천히 걷겠습니다. 물과 편한 신발만 챙겨오세요.',
    category: 'NOTICE',
  },
  {
    title: '이번 달 함께 읽을 책을 골라주세요',
    contents:
      '후보는 에세이 두 권과 소설 한 권입니다. 댓글로 읽고 싶은 책을 남겨주시면 금요일에 확정하겠습니다.',
    category: 'FREE',
  },
  {
    title: '지난 모임에서 나눈 된장찌개 비법',
    contents:
      '멸치육수를 진하게 내고 마지막에 두부를 넣는 방식이 반응이 좋았습니다. 다음에는 반찬 나눔도 해보면 좋겠어요.',
    category: 'REVIEW',
  },
  {
    title: '서달산 코스 난이도 공유',
    contents:
      '이번 코스는 계단이 조금 있지만 쉬는 지점을 넉넉히 잡았습니다. 무릎 보호대가 필요하신 분은 챙겨주세요.',
    category: 'NOTICE',
  },
  {
    title: '클래식 감상곡 추천 받습니다',
    contents:
      '다음 감상회는 익숙한 곡 위주로 준비하려고 합니다. 좋아하는 곡이나 작곡가를 편하게 남겨주세요.',
    category: 'FREE',
  },
  {
    title: '흑석동 골목 사진 후기',
    contents:
      '오래된 간판과 골목 계단을 담아봤는데 생각보다 좋은 사진이 많았습니다. 다음 산책은 오후 빛이 좋은 시간으로 잡겠습니다.',
    category: 'REVIEW',
  },
  {
    title: '이번 달 봉사 일정 확인',
    contents:
      '동작구 복지관 물품 정리 봉사를 신청했습니다. 참여 가능하신 분은 모임 전날까지 알려주세요.',
    category: 'NOTICE',
  },
  {
    title: '허리 부담 적은 스트레칭 영상 공유',
    contents:
      '오늘 배운 동작 중 집에서 하기 좋은 세 가지를 정리했습니다. 통증이 있으면 무리하지 말고 쉬어가세요.',
    category: 'FREE',
  },
  {
    title: '이번 주 영화 후보 세 편',
    contents:
      '가벼운 코미디, 가족 영화, 오래된 명작 한 편을 후보로 올렸습니다. 보고 싶은 영화에 댓글 남겨주세요.',
    category: 'FREE',
  },
  {
    title: '흑석시장 국밥집 방문 후기',
    contents:
      '점심 시간은 조금 붐볐지만 음식이 따뜻하고 양이 넉넉했습니다. 다음에는 분식집도 함께 가보면 좋겠습니다.',
    category: 'REVIEW',
  },
  {
    title: '스마트폰 사진 백업 방법 정리',
    contents:
      '오늘 질문이 많았던 사진 백업 방법을 순서대로 정리했습니다. 다음 시간에는 앨범 정리도 같이 해보겠습니다.',
    category: 'FREE',
  },
  {
    title: '차 모임 장소를 정해요',
    contents:
      '조용히 이야기 나눌 수 있는 카페 두 곳을 후보로 올립니다. 이동이 편한 곳을 댓글로 골라주세요.',
    category: 'NOTICE',
  },
  {
    title: '한강 자전거 안전 수칙',
    contents:
      '헬멧 착용과 속도 조절을 꼭 지켜주세요. 처음 오시는 분은 짧은 코스부터 함께 달리겠습니다.',
    category: 'NOTICE',
  },
  {
    title: '동작구 역사 산책 자료 공유',
    contents:
      '지난번 이야기한 노량진과 흑석동의 옛 지도를 정리했습니다. 다음 산책 때 함께 보면서 걸어보겠습니다.',
    category: 'FREE',
  },
  {
    title: '연금 관리 이야기 나눔 후기',
    contents:
      '서로의 경험을 듣는 것만으로도 도움이 됐습니다. 다음에는 지출 기록 방법을 중심으로 이야기해보겠습니다.',
    category: 'REVIEW',
  },
  {
    title: '다음 통기타 연습곡 안내',
    contents:
      '코드가 어렵지 않은 곡으로 골랐습니다. 악보는 모임 당일 출력해서 나눠드리겠습니다.',
    category: 'NOTICE',
  },
  {
    title: '겨울철 화분 물주기 팁',
    contents:
      '요즘은 흙 상태를 먼저 확인하고 물을 주는 게 좋습니다. 잎 끝이 마른 화분 사진도 함께 가져와 주세요.',
    category: 'FREE',
  },
  {
    title: '수요일 바둑 자리 안내',
    contents:
      '이번 주는 초보자도 편하게 둘 수 있도록 짝을 나눠보겠습니다. 바둑판은 두 세트 준비해두겠습니다.',
    category: 'NOTICE',
  },
  {
    title: '이번 전시 동행 후기',
    contents:
      '작품 설명을 함께 들으니 훨씬 이해가 쉬웠습니다. 다음에는 평일 오전 시간도 고려해보겠습니다.',
    category: 'REVIEW',
  },
  {
    title: '봄 여행 후보지 의견 주세요',
    contents:
      '당일치기로 다녀올 수 있는 곳 위주로 생각하고 있습니다. 걷는 시간이 길지 않은 장소를 추천해주세요.',
    category: 'FREE',
  },
  {
    title: '아침 체조 출석 장소 변경',
    contents:
      '이번 주부터는 바람을 피할 수 있는 주민센터 앞에서 모이겠습니다. 시간은 그대로 오전 8시입니다.',
    category: 'NOTICE',
  },
  {
    title: '손글씨 문장 추천',
    contents:
      '다음 시간에는 짧은 시 문장을 써보려고 합니다. 좋아하는 문장이 있으면 댓글로 남겨주세요.',
    category: 'FREE',
  },
  {
    title: '멘토링 주제 신청 받습니다',
    contents:
      '생활 경험, 취미, 건강 관리처럼 편하게 나눌 수 있는 주제를 받고 있습니다. 부담 없이 적어주세요.',
    category: 'NOTICE',
  },
  {
    title: '주말 문화 탐방 일정 공유',
    contents:
      '이번 주는 가까운 전시관을 다녀오려고 합니다. 이동이 편한 분들은 흑석역에서 함께 출발해요.',
    category: 'NOTICE',
  },
] as const;
const COMMENT_CONTENTS = [
  '시간 맞춰 나가겠습니다. 천천히 걷는 코스라 좋네요.',
  '에세이 쪽이 부담 없이 읽기 좋을 것 같습니다.',
  '지난번 찌개 정말 맛있었습니다. 반찬 나눔도 기대돼요.',
  '쉬는 지점이 넉넉하면 저도 참여해보겠습니다.',
  '익숙한 곡이면 처음 듣는 분들도 편할 것 같아요.',
  '오후 빛 사진 산책 좋습니다. 다음에도 함께할게요.',
  '봉사 일정 확인했습니다. 장갑 챙겨가겠습니다.',
  '집에서도 해볼 수 있게 정리해주셔서 감사합니다.',
  '가족 영화에 한 표 남깁니다.',
  '다음 맛집 탐방도 기대됩니다.',
  '사진 백업 부분을 다시 배워보고 싶었어요.',
  '조용한 카페면 어디든 좋습니다.',
  '안전 수칙 확인했습니다. 헬멧 챙기겠습니다.',
  '옛 지도 보면서 걸으면 재미있을 것 같아요.',
  '지출 기록 방법 주제 좋습니다.',
  '연습곡 미리 들어보고 가겠습니다.',
  '화분 사진 가져가서 여쭤보겠습니다.',
  '초보자도 편하게 둘 수 있다니 좋네요.',
  '평일 오전 일정도 가능하면 참여하겠습니다.',
  '걷는 시간이 짧은 곳이면 좋겠습니다.',
  '장소 변경 확인했습니다.',
  '좋아하는 문장 하나 적어가겠습니다.',
  '건강 관리 경험을 나눠보고 싶습니다.',
  '흑석역에서 같이 출발하겠습니다.',
] as const;

function dataPath(fileName: string) {
  return path.join(DATA_DIR, fileName);
}

function readCsv<T>(fileName: string): T[] {
  return parse(fs.readFileSync(dataPath(fileName), 'utf8'), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

function nullable(value?: string) {
  return value && value.length > 0 ? value : null;
}

function daysFromSeed(days: number) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function vectorLiteral(seed: number) {
  const values = Array.from({ length: 3072 }, (_, index) => {
    const raw = Math.sin((seed + 1) * (index + 1) * 0.013);
    return (raw * 0.05).toFixed(10);
  });

  return `[${values.join(',')}]`;
}

function requireSeedCount<T>(rows: T[], fileName: string) {
  if (rows.length !== DUMMY_COUNT) {
    throw new Error(
      `${fileName} must contain ${DUMMY_COUNT} rows, got ${rows.length}`,
    );
  }
}

function requireRowRange<T>(
  rows: T[],
  fileName: string,
  min: number,
  max: number,
) {
  if (rows.length < min || rows.length > max) {
    throw new Error(
      `${fileName} must contain ${min}-${max} rows, got ${rows.length}`,
    );
  }
}

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset database while NODE_ENV=production');
  }

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ClubReport",
      "UserReport",
      "ClubKeyword",
      "MeetingMember",
      "Meeting",
      "ClubLike",
      "ClubUserBadge",
      "Badge",
      "ClubUser",
      "ArticlePhoto",
      "ArticleLike",
      "Comment",
      "Article",
      "UserWatchLog",
      "UserMarketingAgreement",
      "MarketingAgreement",
      "ChatMedia",
      "ChatMessage",
      "ChatParticipant",
      "ChatRoom",
      "Notification",
      "Report",
      "Block",
      "Address",
      "UserPersonality",
      "UserIdealPersonality",
      "Personality",
      "UserInterest",
      "Interest",
      "Heart",
      "UserPhoto",
      "RefreshToken",
      "LocalAuthAccount",
      "Club",
      "User"
    RESTART IDENTITY CASCADE
  `);

  console.log('Reset database tables.');
}

async function insertAddressSeed() {
  const addresses = readCsv<AddressCsv>('address.csv');

  for (let i = 0; i < addresses.length; i += ADDRESS_CHUNK_SIZE) {
    await prisma.address.createMany({
      data: addresses.slice(i, i + ADDRESS_CHUNK_SIZE).map((address) => ({
        code: address.code,
        sidoCode: address.sidoCode,
        sigunguCode: address.sigunguCode,
        emdCode: address.emdCode,
        riCode: address.riCode,
        fullName: address.fullName,
        sidoName: address.sidoName,
        sigunguName: nullable(address.sigunguName),
        emdName: nullable(address.emdName),
        riName: nullable(address.riName),
        level: address.level as Prisma.AddressCreateManyInput['level'],
        parentCode: nullable(address.parentCode),
      })),
      skipDuplicates: true,
    });
  }

  console.log(`Seeded addresses from CSV: ${addresses.length}`);
}

async function insertKeywordSeed() {
  const interests = readCsv<KeywordCsv>('interest.csv');
  const personalities = readCsv<KeywordCsv>('personality.csv');

  await prisma.interest.createMany({
    data: interests.map((interest) => ({
      id: BigInt(interest.id),
      body: interest.body,
    })),
    skipDuplicates: true,
  });

  await prisma.personality.createMany({
    data: personalities.map((personality) => ({
      id: BigInt(personality.id),
      body: personality.body,
    })),
    skipDuplicates: true,
  });

  console.log(
    `Seeded interests/personality from CSV: ${interests.length}/${personalities.length}`,
  );
}

async function insertUsers() {
  const users = readCsv<SeedUserCsv>('user.csv');
  requireSeedCount(users, 'user.csv');

  const rows = users.map((user, index) => {
    return Prisma.sql`(
      ${BigInt(user.id)},
      ${new Date(user.birthdate)},
      ${Number(user.age)},
      ${user.email},
      ${user.sex}::"Sex",
      ${daysFromSeed(index)},
      ${user.nickname},
      ${daysFromSeed(index)},
      ${user.introVoiceUrl},
      ${user.introText},
      ${user.profileImageUrl},
      ${user.status}::"ActiveStatus",
      ${user.code},
      ${user.provider}::"AuthProvider",
      ${user.providerUserId},
      ${vectorLiteral(Number(user.vibeSeed))}::vector
    )`;
  });

  await prisma.$executeRaw`
    INSERT INTO "User" (
      "id", "birthdate", "age", "email", "sex", "createdAt", "nickname",
      "updatedAt", "introVoiceUrl", "introText", "profileImageUrl", "status",
      "code", "provider", "providerUserId", "vibeVector"
    )
    VALUES ${Prisma.join(rows)}
    ON CONFLICT DO NOTHING
  `;
}

async function insertClubs() {
  const clubs = readCsv<SeedClubCsv>('club.csv');
  requireSeedCount(clubs, 'club.csv');

  const rows = clubs.map((club, index) => {
    return Prisma.sql`(
      ${BigInt(club.id)},
      ${BigInt(club.hostId)},
      ${club.name},
      ${club.introVoiceUrl},
      ${club.introText},
      ${club.category}::"ClubCategory",
      ${Number(club.capacity)},
      ${daysFromSeed(index)},
      ${daysFromSeed(index)},
      ${club.code},
      ${Number(club.likes)},
      ${vectorLiteral(Number(club.vibeSeed))}::vector,
      ${club.thumbnailUrl}
    )`;
  });

  await prisma.$executeRaw`
    INSERT INTO "Club" (
      "id", "hostId", "name", "introVoiceUrl", "introText", "category",
      "capacity", "createdAt", "updatedAt", "code", "likes", "vibeVector",
      "thumbnailUrl"
    )
    VALUES ${Prisma.join(rows)}
    ON CONFLICT DO NOTHING
  `;
}

async function insertSeedData() {
  const seedUsers = readCsv<SeedUserCsv>('user.csv');
  const seedClubs = readCsv<SeedClubCsv>('club.csv');
  const seedClubUsers = readCsv<SeedClubUserCsv>('clubUser.csv');
  requireSeedCount(seedUsers, 'user.csv');
  requireSeedCount(seedClubs, 'club.csv');
  requireRowRange(seedClubUsers, 'clubUser.csv', 20, 30);

  const activeClubUsersByClub = new Map<number, SeedClubUserCsv[]>();
  for (const clubUser of seedClubUsers) {
    if (clubUser.status !== 'ACTIVE') {
      continue;
    }

    const clubId = Number(clubUser.clubId);
    activeClubUsersByClub.set(clubId, [
      ...(activeClubUsersByClub.get(clubId) ?? []),
      clubUser,
    ]);
  }

  const clubMemberFor = (clubId: number, preferGeneral = false) => {
    const members = activeClubUsersByClub.get(clubId) ?? [];
    const preferred = preferGeneral
      ? members.find((member) => member.authority === 'GENERAL')
      : members.find((member) => member.authority === 'HOST');

    return preferred ?? members[0];
  };

  await insertUsers();

  await prisma.refreshToken.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      tokenHash: `heukseok-refresh-token-hash-${index + 1}`,
      expiresAt: daysFromSeed(30 + index),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.localAuthAccount.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      username: `heukseok${String(index + 1).padStart(2, '0')}`,
      passwordHash: `$2b$10$seeded.hash.for.heukseok.user.${String(index + 1).padStart(2, '0')}`,
      userId: BigInt(index + 1),
      isActive: index % 11 !== 0,
      createdAt: daysFromSeed(index),
      updatedAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.userPhoto.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      url: `https://cdn.example.com/images/user-photo/heukseok-${index + 1}.jpg`,
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.marketingAgreement.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      body: `마케팅 정보 수신 동의 항목 ${index + 1}`,
    })),
    skipDuplicates: true,
  });

  await prisma.userInterest.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      interestId: BigInt(index + 1),
      userId: BigInt(index + 1),
      createdAt: daysFromSeed(index),
      updatedAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.userPersonality.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      personalityId: BigInt(index + 1),
      createdAt: daysFromSeed(index),
      updatedAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.userIdealPersonality.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      personalityId: BigInt(index + 11),
      createdAt: daysFromSeed(index),
      updatedAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.userMarketingAgreement.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      marketingAgreementId: BigInt(index + 1),
      userId: BigInt(index + 1),
      agreedAt: daysFromSeed(index),
      isAgreed: index % 3 !== 0,
    })),
    skipDuplicates: true,
  });

  await prisma.heart.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      sentById: BigInt(index + 1),
      sentToId: BigInt(((index + 1) % DUMMY_COUNT) + 1),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.block.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      blockedById: BigInt(index + 1),
      blockedId: BigInt(((index + 2) % DUMMY_COUNT) + 1),
      blockedAt: daysFromSeed(index),
      reason: `대화 빈도 조절 요청 ${index + 1}`,
    })),
    skipDuplicates: true,
  });

  await insertClubs();

  await prisma.chatRoom.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      startedAt: daysFromSeed(index),
      status: 'ACTIVE',
      type: index < 5 ? 'DIRECT' : 'CLUB',
      clubId: index < 5 ? null : BigInt(index + 1),
    })),
    skipDuplicates: true,
  });

  await prisma.chatParticipant.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      roomId: BigInt(index + 1),
      joinedAt: daysFromSeed(index),
      role: index % 5 === 0 ? 'HOST' : 'GENERAL',
    })),
    skipDuplicates: true,
  });

  await prisma.chatMessage.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      participantId: BigInt(index + 1),
      sentAt: daysFromSeed(index),
      updatedAt: daysFromSeed(index),
      readAt: index % 2 === 0 ? daysFromSeed(index + 1) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.chatMedia.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      messageId: BigInt(index + 1),
      type: 'TEXT',
      text:
        index % 2 === 0
          ? '이번 주 모임 장소 확인했습니다.'
          : '좋아요. 흑석역 근처에서 뵐게요.',
    })),
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      type: index % 2 === 0 ? 'CHAT' : 'RECOMMEND',
      isRead: index % 3 === 0,
      createdAt: daysFromSeed(index),
      title: index % 2 === 0 ? '새 채팅이 도착했어요' : '새 모임 추천',
      body:
        index % 2 === 0
          ? `${seedUsers[(index + 1) % DUMMY_COUNT].nickname}님이 메시지를 보냈습니다.`
          : `${seedClubs[index].name} 모임을 확인해보세요.`,
      sentById: BigInt(((index + 1) % DUMMY_COUNT) + 1),
    })),
    skipDuplicates: true,
  });

  await prisma.userWatchLog.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      visitedAt: daysFromSeed(index),
      visitedTo: BigInt(index + 1),
      visitedBy: BigInt(((index + 1) % DUMMY_COUNT) + 1),
    })),
    skipDuplicates: true,
  });

  await prisma.clubUser.createMany({
    data: seedClubUsers.map((clubUser, index) => ({
      id: BigInt(clubUser.id),
      userId: BigInt(clubUser.userId),
      clubId: BigInt(clubUser.clubId),
      requestedAt: daysFromSeed(index - 2),
      joinedAt: daysFromSeed(index),
      authority:
        clubUser.authority as Prisma.ClubUserCreateManyInput['authority'],
      status: clubUser.status as Prisma.ClubUserCreateManyInput['status'],
      joinMessage: clubUser.joinMessage,
    })),
    skipDuplicates: true,
  });

  await prisma.badge.createMany({
    data: BADGE_NAMES.map((name, index) => ({
      id: BigInt(index + 1),
      name,
    })),
    skipDuplicates: true,
  });

  await prisma.clubUserBadge.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      clubUserId: BigInt(index + 1),
      badgeId: BigInt(index + 1),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.clubLike.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      clubId: BigInt(((index + 1) % DUMMY_COUNT) + 1),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  const RECURRENCE_TYPES: RecurrenceType[] = ['DAILY', 'WEEKLY', 'MONTHLY'];
  const DAY_OF_WEEK_VALUES: DayOfWeek[] = [
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI',
    'SAT',
    'SUN',
  ];

  await prisma.meeting.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => {
      const type = RECURRENCE_TYPES[index % RECURRENCE_TYPES.length];
      return {
        id: BigInt(index + 1),
        name: `Seed Meeting ${index + 1}`,
        introText: `Seed meeting intro ${index + 1}`,
        spot: `Seed meeting spot ${index + 1}`,
        capacity: 8 + (index % 5),
        cost: index % 4 === 0 ? null : `1인 ${(index + 1) * 1000}원`,
        joinPolicy: index % 3 === 0 ? 'APPROVAL_REQUIRED' : 'AUTO',
        isRegular: index % 2 === 0,
        recurrenceType: type,
        daysOfWeek: type === 'WEEKLY' ? [DAY_OF_WEEK_VALUES[index % 7]] : [],
        dayOfMonth: type === 'MONTHLY' ? (index % 28) + 1 : null,
        hour: (index + 9) % 24,
        minute: (index * 10) % 60,
        createdAt: daysFromSeed(index),
        updatedAt: daysFromSeed(index),
        clubId: BigInt(index + 1),
      };
    }),
    skipDuplicates: true,
  });

  await prisma.meetingMember.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      meetingId: BigInt(index + 1),
      clubUserId: BigInt(index + 1),
      joinedAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.clubKeyword.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      clubId: BigInt(index + 1),
      keywordId: BigInt(index + 21),
    })),
    skipDuplicates: true,
  });

  await prisma.article.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => {
      const clubId = index + 1;
      const author = clubMemberFor(clubId);
      const article = ARTICLE_SEEDS[index];

      return {
        id: BigInt(index + 1),
        title: article.title,
        contents: article.contents,
        category: article.category as Prisma.ArticleCreateManyInput['category'],
        userId: BigInt(author.userId),
        clubId: BigInt(clubId),
        createdAt: daysFromSeed(index),
        updatedAt: daysFromSeed(index),
        isPinned: article.category === 'NOTICE' && index % 4 === 0,
        view: 18 + index * 7,
        likes: index % 6,
        isPublic: true,
      };
    }),
    skipDuplicates: true,
  });

  await prisma.comment.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => {
      const clubId = index + 1;
      const commenter = clubMemberFor(clubId, true);

      return {
        id: BigInt(index + 1),
        contents: COMMENT_CONTENTS[index],
        userId: BigInt(commenter.userId),
        articleId: BigInt(index + 1),
        depth: 0,
        createdAt: daysFromSeed(index),
      };
    }),
    skipDuplicates: true,
  });

  await prisma.articleLike.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => {
      const clubId = index + 1;
      const member = clubMemberFor(clubId, true);

      return {
        id: BigInt(index + 1),
        articleId: BigInt(index + 1),
        userId: BigInt(member.userId),
        createdAt: daysFromSeed(index),
      };
    }),
    skipDuplicates: true,
  });

  await prisma.articlePhoto.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => {
      const clubId = index + 1;
      const author = clubMemberFor(clubId);

      return {
        id: BigInt(index + 1),
        photoUrl: `https://cdn.example.com/images/article/heukseok-${index + 1}.jpg`,
        createdAt: daysFromSeed(index),
        articleId: BigInt(index + 1),
        clubUserId: BigInt(author.id),
      };
    }),
    skipDuplicates: true,
  });

  await prisma.report.createMany({
    data: Array.from({ length: REPORT_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      reportedById: BigInt((index % DUMMY_COUNT) + 1),
      reportedAt: daysFromSeed(index),
      reason: `seed report reason ${index + 1}`,
      category: index % 2 === 0 ? 'OTHERS' : 'SPAM',
    })),
    skipDuplicates: true,
  });

  await prisma.userReport.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      reportId: BigInt(index + 1),
      reportedUserId: BigInt(((index + 1) % DUMMY_COUNT) + 1),
    })),
    skipDuplicates: true,
  });

  await prisma.clubReport.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      reportId: BigInt(DUMMY_COUNT + index + 1),
      reportedClubId: BigInt(index + 1),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded dummy data: about ${DUMMY_COUNT} rows per table`);
}

async function resetSequences() {
  const tableNames = [
    'User',
    'RefreshToken',
    'UserPhoto',
    'Heart',
    'LocalAuthAccount',
    'Interest',
    'UserInterest',
    'Personality',
    'UserIdealPersonality',
    'UserPersonality',
    'Block',
    'Report',
    'Notification',
    'ChatRoom',
    'ChatParticipant',
    'ChatMessage',
    'ChatMedia',
    'MarketingAgreement',
    'UserMarketingAgreement',
    'UserWatchLog',
    'Article',
    'Comment',
    'ArticleLike',
    'ArticlePhoto',
    'Club',
    'ClubUser',
    'Badge',
    'ClubUserBadge',
    'ClubLike',
    'Meeting',
    'MeetingMember',
    'ClubKeyword',
    'UserReport',
    'ClubReport',
  ];

  for (const tableName of tableNames) {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"${tableName}"', 'id'),
        COALESCE((SELECT MAX("id") FROM "${tableName}"), 1),
        true
      )
    `);
  }
}

async function main() {
  console.log('Start seeding...');
  await resetDatabase();
  await insertAddressSeed();
  await insertKeywordSeed();
  await insertSeedData();
  await resetSequences();
  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
