import {
  ActiveStatus,
  AddressLevel,
  AuthProvider,
  PrismaClient,
  Sex,
} from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
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
  introVoiceUrl: string;
  introText: string;
  profileImageUrl: string;
  status: string;
  code: string;
  provider: string;
  providerUserId: string;
  vibeVector: string;
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

async function main() {
  console.log('🌱 CSV 데이터 시딩 시작...');

  // 1. CSV 파일 경로 설정
  const userCsvFilePath = path.resolve(__dirname, 'data', 'user.csv');
  const addressCsvFilePath = path.resolve(__dirname, 'data', 'address.csv');

  // 2. 파일 읽기
  const userFileContent = fs.readFileSync(userCsvFilePath, {
    encoding: 'utf-8',
  });
  const addressFileContent = fs.readFileSync(addressCsvFilePath, {
    encoding: 'utf-8',
  });

  // 3. CSV 파싱
  const addresses: RawAddressRecord[] = parse(addressFileContent, {
    columns: true, // 첫 줄을 헤더(키)로 사용
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  console.log(`📊 총 ${addresses.length}개의 데이터를 찾았습니다.`);
  const users: RawUserRecord[] = parse(userFileContent, {
    columns: true, // 첫 줄을 헤더(키)로 사용
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`📊 총 ${users.length}개의 데이터를 찾았습니다.`);

  // 4. DB에 넣기 (Address)
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
