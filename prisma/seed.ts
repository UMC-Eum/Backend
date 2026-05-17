import {
  ActiveStatus,
  AddressLevel,
  AuthProvider,
  BlockStatus,
  ChatMediaType,
  ChatRoomStatus,
  NotificationType,
  PrismaClient,
  Sex,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import { Prisma } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// prisma/seed.ts 상단에 추가
interface RawUserRecord {
  id: string;
  birthdate: string;
  email: string;
  sex: string;
  createdAt: string;
  nickname: string;
  updatedAt: string;
  deletedAt?: string;
  idealVoiceUrl?: string;
  introVoiceUrl: string;
  introText: string;
  profileImageUrl: string;
  status: string;
  code: string;
  provider: string;
  providerUserId: string;
  vibeVector: string;
  age: string;
}
interface RawAddressRecord {
  code: string;
  sidoCode: string;
  sigunguCode: string;
  emdCode: string;
  riCode: string;
  fullName: string;
  sidoName: string;
  sigunguName?: string;
  emdName?: string;
  riName?: string;
  level: string; // CSV에서는 일단 문자열로 들어옴
  parentCode?: string;
}
// 1. 공통 및 단순 테이블
interface RawInterestRecord {
  id: string;
  body: string;
}

interface RawPersonalityRecord {
  id: string;
  body: string;
}

interface RawMarketingAgreementRecord {
  id: string;
  body: string;
}

// 2. 유저 관련 매핑 및 활동
interface RawUserInterestRecord {
  id: string;
  interestId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface RawUserPersonalityRecord {
  id: string;
  userId: string;
  personalityId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface RawUserIdealPersonalityRecord {
  id: string;
  userId: string;
  personalityId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface RawUserMarketingAgreementRecord {
  id: string;
  marketingAgreementId: string;
  userId: string;
  agreedAt: string;
  isAgreed: string; // CSV에서는 보통 'true'/'false' 문자열
  deletedAt?: string;
}

// 3. 소셜 및 매칭 (Heart, Block, Report)
interface RawHeartRecord {
  id: string;
  sentById: string;
  sentToId: string;
  createdAt: string;
  deletedAt?: string;
  status: string;
}

interface RawBlockRecord {
  id: string;
  blockedById: string;
  blockedId: string;
  blockedAt: string;
  reason: string;
  status: string;
  deletedAt?: string;
}

interface RawReportRecord {
  id: string;
  reportedById: string;
  reportedId: string;
  reportedAt: string;
  reason: string;
  category?: string;
  chatRoomId?: string;
  deletedAt?: string;
}

// 4. 채팅 및 알림
interface RawChatRoomRecord {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  status: string;
}

interface RawChatParticipantRecord {
  id: string;
  userId: string;
  roomId: string;
  joinedAt: string;
  endedAt?: string;
}

interface RawChatMessageRecord {
  id: string;
  sentById: string;
  sentToId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  readAt?: string;
  deletedAt?: string;
}

interface RawChatMediaRecord {
  id: string;
  messageId: string;
  url?: string;
  type: string;
  text?: string;
  durationSec?: string;
}

interface RawNotificationRecord {
  id: string;
  userId: string;
  type: string;
  isRead: string;
  title: string;
  body: string;
  createdAt: string;
  deletedAt?: string;
  sentById?: string;
}
const ROOT = process.cwd();

function dataPath(file: string) {
  return path.join(ROOT, 'prisma', 'data', file);
}

async function main() {
  console.log('🌱 모든 테이블 CSV 데이터 시딩 시작...');

  // 1. CSV 파일 경로 설정 (나머지 테이블 추가)
  const paths = {
    user: dataPath('user.csv'),
    address: dataPath('address.csv'),
    interest: dataPath('interest.csv'),
    personality: dataPath('personality.csv'),
    marketingAgreement: dataPath('marketingAgreement.csv'),
    userInterest: dataPath('userInterest.csv'),
    userPersonality: dataPath('userPersonality.csv'),
    userIdealPersonality: dataPath('userIdealPersonality.csv'),
    userMarketingAgreement: dataPath('userMarketingAgreement.csv'),
    heart: dataPath('heart.csv'),
    block: dataPath('block.csv'),
    report: dataPath('report.csv'),
    chatRoom: dataPath('chatroom.csv'),
    chatParticipant: dataPath('chatParticipant.csv'),
    chatMessage: dataPath('chatMessage.csv'),
    chatMedia: dataPath('chatMedia.csv'),
    notification: dataPath('notification.csv'),
  };

  // 2. 파일 읽기 및 파싱 함수 (반복 줄이기용)
  const parseCsv = <T>(filePath: string): T[] => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ 파일이 없어요: ${filePath}`);
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  };

  // 3. 데이터 로드
  const addresses = parseCsv<RawAddressRecord>(paths.address);
  console.log(`📊 데이터 로드 완료: 주소(${addresses.length})`);
  const users = parseCsv<RawUserRecord>(paths.user);
  console.log(`📊 데이터 로드 완료: 유저(${users.length})`);
  const interests = parseCsv<RawInterestRecord>(paths.interest);
  console.log(`📊 데이터 로드 완료: 관심사(${interests.length})`);
  const personalities = parseCsv<RawPersonalityRecord>(paths.personality);
  console.log(`📊 데이터 로드 완료: 성향(${personalities.length})`);
  const marketingAgreements = parseCsv<RawMarketingAgreementRecord>(
    paths.marketingAgreement,
  );
  console.log(
    `📊 데이터 로드 완료: 마케팅 약관(${marketingAgreements.length})`,
  );
  const userInterests = parseCsv<RawUserInterestRecord>(paths.userInterest);
  console.log(`📊 데이터 로드 완료: 유저별 관심사(${userInterests.length})`);
  const userPersonalities = parseCsv<RawUserPersonalityRecord>(
    paths.userPersonality,
  );
  console.log(`📊 데이터 로드 완료: 유저별 성향(${userPersonalities.length})`);
  const userIdealPersonalities = parseCsv<RawUserIdealPersonalityRecord>(
    paths.userIdealPersonality,
  );
  console.log(
    `📊 데이터 로드 완료: 이상형 성향(${userIdealPersonalities.length})`,
  );
  const userMarketingAgreements = parseCsv<RawUserMarketingAgreementRecord>(
    paths.userMarketingAgreement,
  );
  console.log(
    `📊 데이터 로드 완료: 유저별 마케팅 동의 현황(${userMarketingAgreements.length})`,
  );
  const hearts = parseCsv<RawHeartRecord>(paths.heart);
  console.log(`📊 데이터 로드 완료: 마음(${hearts.length})`);
  const blocks = parseCsv<RawBlockRecord>(paths.block);
  console.log(`📊 데이터 로드 완료: 차단(${blocks.length})`);
  const reports = parseCsv<RawReportRecord>(paths.report);
  console.log(`📊 데이터 로드 완료: 신고(${reports.length})`);
  const chatRooms = parseCsv<RawChatRoomRecord>(paths.chatRoom);
  console.log(`📊 데이터 로드 완료: 채팅방(${chatRooms.length})`);
  const chatParticipants = parseCsv<RawChatParticipantRecord>(
    paths.chatParticipant,
  );
  console.log(`📊 데이터 로드 완료: 채팅 참여자(${chatParticipants.length})`);
  const chatMessages = parseCsv<RawChatMessageRecord>(paths.chatMessage);
  console.log(`📊 데이터 로드 완료: 채팅 메세지(${chatMessages.length})`);
  const chatMedias = parseCsv<RawChatMediaRecord>(paths.chatMedia);
  console.log(`📊 데이터 로드 완료: 채팅 미디어(${chatMedias.length})`);
  const notifications = parseCsv<RawNotificationRecord>(paths.notification);
  console.log(`📊 데이터 로드 완료: 알림(${notifications.length})`);

  // 4. DB에 넣기
  console.log('📍 주소 데이터 삽입 중...');
  // 10,000개씩 묶어서 처리 (4만 9천 개면 총 5번의 쿼리로 끝남)
  const ADDRESS_CHUNK_SIZE = 10000;
  for (let i = 0; i < addresses.length; i += ADDRESS_CHUNK_SIZE) {
    const chunk = addresses.slice(i, i + ADDRESS_CHUNK_SIZE).map((addr) => ({
      code: addr.code,
      sidoCode: addr.sidoCode,
      sigunguCode: addr.sigunguCode,
      emdCode: addr.emdCode,
      riCode: addr.riCode,
      fullName: addr.fullName,
      sidoName: addr.sidoName,
      sigunguName: addr.sigunguName || null,
      emdName: addr.emdName || null,
      riName: addr.riName || null,
      level: addr.level as AddressLevel, // AddressLevel Enum 캐스팅
      parentCode: addr.parentCode || null,
    }));

    await prisma.address.createMany({
      data: chunk,
      skipDuplicates: true, // 이미 있는 주소는 건너뛰기 (에러 방지)
    });

    console.log(
      `✅ 주소 삽입 중... (${Math.min(i + ADDRESS_CHUNK_SIZE, addresses.length)}/${addresses.length})`,
    );
  }

  console.log('📍 주소 삽입 완료! 이제 유저 데이터를 삽입합니다.');
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email }, // 중복 방지를 위해 email 기준 업데이트/생성
      update: {}, // 이미 있으면 업데이트 안 함 (필요시 수정)
      create: {
        id: BigInt(user.id),
        birthdate: new Date(user.birthdate),
        email: user.email,
        sex: user.sex as Sex,
        createdAt: new Date(user.createdAt),
        nickname: user.nickname,
        updatedAt: new Date(user.updatedAt),
        deletedAt: user.deletedAt ? new Date(user.deletedAt) : null,
        idealVoiceUrl: user.idealVoiceUrl || null,
        introVoiceUrl: user.introVoiceUrl,
        introText: user.introText,
        profileImageUrl: user.profileImageUrl,
        status: user.status as ActiveStatus,
        code: user.code,
        provider: user.provider as AuthProvider,
        providerUserId: user.providerUserId,
        // vibeVector는 JSON 객체로 변환해서 저장
        vibeVector: user.vibeVector
          ? (JSON.parse(user.vibeVector) as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        age: Number(user.age),
      },
    });
  }
  // 5. 기초 정보 (Interest, Personality, MarketingAgreement)
  console.log('📍 기초 정보 삽입 중...');
  await prisma.interest.createMany({
    data: interests.map((i) => ({ id: BigInt(i.id), body: i.body })),
    skipDuplicates: true,
  });

  await prisma.personality.createMany({
    data: personalities.map((p) => ({ id: BigInt(p.id), body: p.body })),
    skipDuplicates: true,
  });

  await prisma.marketingAgreement.createMany({
    data: marketingAgreements.map((m) => ({ id: BigInt(m.id), body: m.body })),
    skipDuplicates: true,
  });

  // 6. 유저 매핑 (Interest, Personality, Ideal, Marketing)
  console.log('📍 유저 매핑 데이터 삽입 중...');
  await prisma.userInterest.createMany({
    data: userInterests.map((ui) => ({
      id: BigInt(ui.id),
      userId: BigInt(ui.userId),
      interestId: BigInt(ui.interestId),
      createdAt: new Date(ui.createdAt),
      updatedAt: new Date(ui.updatedAt),
      deletedAt: ui.deletedAt ? new Date(ui.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.userPersonality.createMany({
    data: userPersonalities.map((up) => ({
      id: BigInt(up.id),
      userId: BigInt(up.userId),
      personalityId: BigInt(up.personalityId),
      createdAt: new Date(up.createdAt),
      updatedAt: new Date(up.updatedAt),
      deletedAt: up.deletedAt ? new Date(up.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.userIdealPersonality.createMany({
    data: userIdealPersonalities.map((uip) => ({
      id: BigInt(uip.id),
      userId: BigInt(uip.userId),
      personalityId: BigInt(uip.personalityId),
      createdAt: new Date(uip.createdAt),
      updatedAt: new Date(uip.updatedAt),
      deletedAt: uip.deletedAt ? new Date(uip.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.userMarketingAgreement.createMany({
    data: userMarketingAgreements.map((uma) => ({
      id: BigInt(uma.id),
      userId: BigInt(uma.userId),
      marketingAgreementId: BigInt(uma.marketingAgreementId),
      agreedAt: new Date(uma.agreedAt),
      isAgreed: uma.isAgreed === 'true' || uma.isAgreed === '1',
      deletedAt: uma.deletedAt ? new Date(uma.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  // 7. 소셜 (Heart, Block, Report)
  console.log('📍 소셜 활동 데이터 삽입 중...');
  await prisma.heart.createMany({
    data: hearts.map((h) => ({
      id: BigInt(h.id),
      sentById: BigInt(h.sentById),
      sentToId: BigInt(h.sentToId),
      createdAt: new Date(h.createdAt),
      deletedAt: h.deletedAt ? new Date(h.deletedAt) : null,
      status: h.status as ActiveStatus,
    })),
    skipDuplicates: true,
  });

  await prisma.block.createMany({
    data: blocks.map((b) => ({
      id: BigInt(b.id),
      blockedById: BigInt(b.blockedById),
      blockedId: BigInt(b.blockedId),
      blockedAt: new Date(b.blockedAt),
      reason: b.reason,
      status: b.status as BlockStatus,
      deletedAt: b.deletedAt ? new Date(b.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.report.createMany({
    data: reports.map((r) => ({
      id: BigInt(r.id),
      reportedById: BigInt(r.reportedById),
      reportedId: BigInt(r.reportedId),
      reportedAt: new Date(r.reportedAt),
      reason: r.reason,
      category: r.category || null,
      chatRoomId: r.chatRoomId ? BigInt(r.chatRoomId) : null,
      deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  // 8. 채팅 및 알림
  console.log('📍 채팅 및 알림 데이터 삽입 중...');
  await prisma.chatRoom.createMany({
    data: chatRooms.map((cr) => ({
      id: BigInt(cr.id),
      userId: BigInt(cr.userId),
      startedAt: new Date(cr.startedAt),
      endedAt: cr.endedAt ? new Date(cr.endedAt) : null,
      status: cr.status as ChatRoomStatus,
    })),
    skipDuplicates: true,
  });

  await prisma.chatParticipant.createMany({
    data: chatParticipants.map((cp) => ({
      id: BigInt(cp.id),
      userId: BigInt(cp.userId),
      roomId: BigInt(cp.roomId),
      joinedAt: new Date(cp.joinedAt),
      endedAt: cp.endedAt ? new Date(cp.endedAt) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.chatMessage.createMany({
    data: chatMessages.map((cm) => ({
      id: BigInt(cm.id),
      sentById: BigInt(cm.sentById),
      sentToId: BigInt(cm.sentToId),
      roomId: BigInt(cm.roomId),
      sentAt: new Date(cm.sentAt),
      updatedAt: new Date(cm.updatedAt),
      readAt: cm.readAt ? new Date(cm.readAt) : null,
      deletedAt: cm.deletedAt ? new Date(cm.deletedAt) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.chatMedia.createMany({
    data: chatMedias.map((cm) => ({
      id: BigInt(cm.id),
      messageId: BigInt(cm.messageId),
      url: cm.url || null,
      type: cm.type as ChatMediaType,
      text: cm.text || null,
      durationSec: cm.durationSec ? parseInt(cm.durationSec) : null,
    })),
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      id: BigInt(n.id),
      userId: BigInt(n.userId),
      type: n.type as NotificationType,
      isRead: n.isRead === 'true' || n.isRead === '1',
      title: n.title,
      body: n.body,
      createdAt: new Date(n.createdAt),
      deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
      sentById: n.sentById ? BigInt(n.sentById) : null,
    })),
    skipDuplicates: true,
  });

  console.log('✅ 시딩 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
