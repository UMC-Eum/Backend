-- MeetingMember.joinMessage 제거 (정모 참석 신청은 신청 메시지를 받지 않음)
ALTER TABLE "MeetingMember" DROP COLUMN "joinMessage";
