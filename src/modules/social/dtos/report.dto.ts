export interface ReportDto {
  targetUserId: number;
  reason: string;
}
export interface ReportResponseDto {
  reportId: number;
}
/*
{
  "targetUserId": 9,
  "category": "HARASSMENT",
  "description": "사유 상세",
  "evidenceMessageId": 9001
}*/
