import {
  DayOfWeek,
  Prisma,
  PrismaClient,
  RecurrenceType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { scryptSync } from 'crypto';
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

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'prisma', 'data');
const DUMMY_COUNT = 10;
const REPORT_COUNT = DUMMY_COUNT * 2;
const ADDRESS_CHUNK_SIZE = 5_000;
const now = new Date('2026-01-10T09:00:00.000Z');

const S3_SEED_BUCKET =
  process.env.S3_SEED_BUCKET?.trim() || 'eum-voice-staging';

function s3Uri(...parts: Array<string | number | bigint>) {
  const key = parts
    .map((part) => String(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

  return `s3://${S3_SEED_BUCKET}/${key}`;
}
// 그룹 채팅 테스트용: 이 클럽에 여러 명을 ACTIVE 멤버로 넣는다.
// host(user 1 = admin01)는 기존 clubUser로 이미 등록돼 있고, 아래 유저들을 추가한다.
const GROUP_CHAT_CLUB_ID = 1;
const GROUP_CHAT_MEMBER_USER_IDS = [2, 3, 4]; // admin02~admin04

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set before running prisma seed.`);
  }

  return value;
}

function isProductionSeedAllowed() {
  return (
    process.env.ALLOW_PRODUCTION_SEED === 'true' ||
    process.argv.includes('--force') ||
    process.argv.includes('--allow-production')
  );
}

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
  const values = Array.from({ length: 6 }, (_, index) => {
    const sign = (seed + index) % 2 === 0 ? 1 : -1;
    return (sign * (seed + index + 1) * 0.1).toFixed(1);
  });

  return `[${values.join(',')}]`;
}

function createLocalPasswordHash(password: string, username: string) {
  const salt = Buffer.from(`seed-local-auth-${username}`);
  const hash = scryptSync(password, salt, 64);

  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production' && !isProductionSeedAllowed()) {
    throw new Error(
      'Refusing to reset database while NODE_ENV=production. Set ALLOW_PRODUCTION_SEED=true or pass --force/--allow-production if you really intend to seed production.',
    );
  }

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ClubReport",
      "UserReport",
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
  const rows = Array.from({ length: DUMMY_COUNT }, (_, index) => {
    const id = BigInt(index + 1);
    const sex = index % 2 === 0 ? 'M' : 'F';

    return Prisma.sql`(
      ${id},
      ${daysFromSeed(-(18_250 + index * 365))},
      ${50 + index},
      ${`seed-user-${index + 1}@example.com`},
      ${sex}::"Sex",
      ${daysFromSeed(index)},
      ${`seed-user-${index + 1}`},
      ${daysFromSeed(index)},
      ${s3Uri('voice', 'intro', `seed-user-${index + 1}.m4a`)},
      ${`seed intro text ${index + 1}`},
      ${s3Uri('images', id, 'profile', `seed-user-${index + 1}.jpg`)},
      ${'ACTIVE'}::"ActiveStatus",
      ${index < 5 ? '1111010100' : '1111010200'},
      ${'KAKAO'}::"AuthProvider",
      ${`SEED_PROVIDER_${index + 1}`},
      ${vectorLiteral(index)}::vector
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
  const categories = [
    'SPORTS',
    'HOBBY',
    'CULTURE_ART',
    'VOLUNTEER',
    'FOOD',
    'STUDY',
    'OTHERS',
  ];

  const rows = Array.from({ length: DUMMY_COUNT }, (_, index) => {
    const id = BigInt(index + 1);
    const hostId = BigInt(index + 1);

    return Prisma.sql`(
      ${id},
      ${hostId},
      ${`Seed Club ${index + 1}`},
      ${s3Uri('voice', 'club', id, `seed-club-${index + 1}.m4a`)},
      ${`seed club intro ${index + 1}`},
      ${categories[index % categories.length]}::"ClubCategory",
      ${20 + index},
      ${daysFromSeed(index)},
      ${daysFromSeed(index)},
      ${index < 5 ? '1111010100' : '1111010200'},
      ${index * 2},
      ${vectorLiteral(index + 20)}::vector,
      ${s3Uri('images', id, 'club', `seed-club-${index + 1}.jpg`)}
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

async function insertDummyData() {
  await insertUsers();

  const localAuthSeedPassword = requiredEnv('LOCAL_AUTH_SEED_PASSWORD');

  await prisma.localAuthAccount.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => {
      const username = `admin${String(index + 1).padStart(2, '0')}`;

      return {
        id: BigInt(index + 1),
        username,
        passwordHash: createLocalPasswordHash(localAuthSeedPassword, username),
        userId: BigInt(index + 1),
        isActive: true,
        createdAt: daysFromSeed(index),
        updatedAt: daysFromSeed(index),
      };
    }),
    skipDuplicates: true,
  });

  await prisma.refreshToken.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      tokenHash: `seed-refresh-token-hash-${index + 1}`,
      expiresAt: daysFromSeed(30 + index),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.userPhoto.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      url: s3Uri(
        'images',
        BigInt(index + 1),
        'user-photo',
        `seed-${index + 1}.jpg`,
      ),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.marketingAgreement.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      body: `Seed marketing agreement ${index + 1}`,
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
      reason: `seed block reason ${index + 1}`,
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
      role: index < 5 ? 'GENERAL' : 'HOST',
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
      text: `seed chat message ${index + 1}`,
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
      title: `Seed notification ${index + 1}`,
      body: `Seed notification body ${index + 1}`,
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
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      userId: BigInt(index + 1),
      clubId: BigInt(index + 1),
      joinedAt: daysFromSeed(index),
      authority: 'HOST',
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });

  // 그룹 채팅 테스트용: GROUP_CHAT_CLUB_ID 클럽에 host 외 유저들을 ACTIVE GENERAL로 추가
  await prisma.clubUser.createMany({
    data: GROUP_CHAT_MEMBER_USER_IDS.map((userId, i) => ({
      id: BigInt(DUMMY_COUNT + i + 1),
      userId: BigInt(userId),
      clubId: BigInt(GROUP_CHAT_CLUB_ID),
      joinedAt: daysFromSeed(i),
      authority: 'GENERAL',
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });

  await prisma.badge.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      name: `Seed Badge ${index + 1}`,
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

  await prisma.article.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      title: `Seed Article ${index + 1}`,
      contents: `Seed article contents ${index + 1}`,
      category: index % 2 === 0 ? 'FREE' : 'NOTICE',
      userId: BigInt(index + 1),
      clubId: BigInt(index + 1),
      createdAt: daysFromSeed(index),
      updatedAt: daysFromSeed(index),
      isPinned: index === 0,
      view: index * 10,
      likes: index,
      isPublic: true,
    })),
    skipDuplicates: true,
  });

  await prisma.comment.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      contents: `Seed comment ${index + 1}`,
      userId: BigInt(index + 1),
      articleId: BigInt(index + 1),
      depth: 0,
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.articleLike.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      articleId: BigInt(index + 1),
      userId: BigInt(index + 1),
      createdAt: daysFromSeed(index),
    })),
    skipDuplicates: true,
  });

  await prisma.articlePhoto.createMany({
    data: Array.from({ length: DUMMY_COUNT }, (_, index) => ({
      id: BigInt(index + 1),
      photoUrl: s3Uri(
        'images',
        BigInt(index + 1),
        'article',
        `seed-${index + 1}.jpg`,
      ),
      createdAt: daysFromSeed(index),
      articleId: BigInt(index + 1),
      clubUserId: BigInt(index + 1),
    })),
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
    'LocalAuthAccount',
    'RefreshToken',
    'UserPhoto',
    'Heart',
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
  await insertDummyData();
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
