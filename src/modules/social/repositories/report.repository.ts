import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ReportResponseDto } from '../dtos/report.dto';
import { ReportCategory } from '@prisma/client';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO(schema): Report 모델이 재구조됨.
  //   - 옛: Report{reportedById, reportedId, reason, category(String), chatRoomId, ...} (단일 테이블)
  //   - 신: Report{reportedById, reason, category(ReportCategory enum), ...} + UserReport{reportId, reportedUserId} 분리
  // 변경 영향:
  //   1) "내가 X를 신고한 적 있는지" 체크가 Report unique 인덱스 → UserReport + report join으로 변경
  //   2) category가 String → ReportCategory enum이라 invalid한 값은 런타임에 에러. boundary(컨트롤러)에서 validate 필요.
  //   3) chatRoomId 필드가 새 Report에서 사라짐 → 신고 컨텍스트(어느 채팅방)가 DB에 보존되지 않음. UserReport에도 없음.
  //      DTO 응답에는 echo만 함. 필요 시 ClubReport 패턴 같은 새 join table 추가 검토.
  async createReport(
    userId: string,
    targetUserId: string,
    reason: string,
    category: string,
    chatRoomId: string,
  ): Promise<ReportResponseDto> {
    // TODO(business): category 문자열 validation을 컨트롤러/DTO 레벨로 옮기는 게 정석. 일단 캐스팅 + 잘못된 값이면 throw.
    if (!(category in ReportCategory)) {
      throw new Error(`Invalid report category: ${category}`);
    }
    const cat = category as ReportCategory;

    const exist = await this.prisma.userReport.findFirst({
      where: {
        reportedUserId: BigInt(targetUserId),
        report: { reportedById: BigInt(userId), deletedAt: null },
      },
      select: { report: { select: { id: true } } },
    });
    if (exist != null) {
      return {
        reportId: Number(exist.report.id),
        category,
        reason: 'Already reported.',
        chatRoomId: Number(chatRoomId),
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const r = await tx.report.create({
        data: {
          reportedById: BigInt(userId),
          reason,
          category: cat,
          reportedAt: new Date(),
        },
      });
      await tx.userReport.create({
        data: {
          reportId: r.id,
          reportedUserId: BigInt(targetUserId),
        },
      });
      return r;
    });

    return {
      reportId: Number(created.id),
      category,
      reason,
      chatRoomId: Number(chatRoomId),
    };
  }
}
