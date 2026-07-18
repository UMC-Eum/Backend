import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    // RDS는 SSL 강제 + Amazon CA 체인이라 node-postgres가 self-signed로
    // 인식. 공용 dev/staging DB라 검증을 생략한다. 운영 DB 연결 시에는
    // RDS root CA 번들로 verify-full로 격상 필요.
    const isRds = url.includes('.rds.amazonaws.com');

    super({
      adapter: new PrismaPg({
        connectionString: url,
        ...(isRds && { ssl: { rejectUnauthorized: false } }),
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
