import { ActiveStatus, AuthProvider, PrismaClient, Sex } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync'; // 동기 방식으로 간단하게 처리
import * as dotenv from 'dotenv';
import { Prisma } from '@prisma/client';
dotenv.config();
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
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
  introVoiceUrl?: string;
  introText?: string;
  profileImageUrl?: string;
  status: string;
  code: string;
  provider: string;
  providerUserId: string;
  vibeVector: string;
}

async function main() {
  console.log('🌱 CSV 데이터 시딩 시작...');

  // 1. CSV 파일 경로 설정
  const csvFilePath = path.resolve(__dirname, 'data', 'user.csv');
  // 2. 파일 읽기
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

  // 3. CSV 파싱
  const records: RawUserRecord[] = parse(fileContent, {
    columns: true, // 첫 줄을 헤더(키)로 사용
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`📊 총 ${records.length}개의 데이터를 찾았습니다.`);
  console.log(records);

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  // 4. DB에 넣기
  for (const record of records) {
    await prisma.user.upsert({
      where: { email: record.email }, // 중복 방지를 위해 email 기준 업데이트/생성
      update: {}, // 이미 있으면 업데이트 안 함 (필요시 수정)
      create: {
        id: BigInt(record.id),
        birthdate: new Date(record.birthdate),
        email: record.email,
        sex: record.sex as Sex,
        createdAt: new Date(record.createdAt),
        nickname: record.nickname,
        updatedAt: new Date(record.updatedAt),
        deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        idealVoiceUrl: record.idealVoiceUrl || null,
        introVoiceUrl: record.introVoiceUrl as string,
        introText: record.introText as string,
        profileImageUrl: record.profileImageUrl as string,
        status: record.status as ActiveStatus,
        code: record.code,
        provider: record.provider as AuthProvider,
        providerUserId: record.providerUserId,
        // vibeVector는 JSON 객체로 변환해서 저장
        vibeVector: record.vibeVector
          ? (JSON.parse(record.vibeVector) as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

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
