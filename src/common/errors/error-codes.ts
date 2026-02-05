import { HttpStatus } from '@nestjs/common';

export const ERROR_DEFINITIONS = {
  // AGREE
  AGREE_DOESNOT_EXIST: {
    status: HttpStatus.NOT_FOUND,
    code: 'AGREE-001',
    message: '존재하지 않는 약관입니다.',
  },
  // NOTI
  NOTI_DOESNOT_EXIST: {
    status: HttpStatus.NOT_FOUND,
    code: 'NOTI-001',
    message: '존재하지 않는 알림입니다.',
  },
  // AUTH
  AUTH_LOGIN_REQUIRED: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-001',
    message: '로그인이 필요한 서비스입니다. 로그인 후 이용해주세요.',
  },
  AUTH_SESSION_EXPIRED: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-002',
    message: '보안을 위해 자동 로그아웃 되었습니다. 다시 로그인해 주세요.',
  },
  AUTH_EMAIL_ALREADY_EXISTS: {
    status: HttpStatus.CONFLICT,
    code: 'AUTH-003',
    message: '이미 가입된 이메일입니다. 다른 로그인 방법을 이용해 주세요.',
  },
  AUTH_KAKAO_TOKEN_INVALID: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-004',
    message: '카카오 인증 정보가 유효하지 않습니다. 다시 로그인해 주세요.',
  },
  AUTH_KAKAO_TOKEN_EXCHANGE_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'AUTH-005',
    message:
      '카카오 인증 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  AUTH_KAKAO_PROFILE_UNAUTHORIZED: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-006',
    message: '카카오 인증이 만료되었습니다. 다시 로그인해 주세요.',
  },
  AUTH_KAKAO_PROFILE_FETCH_FAILED: {
    status: HttpStatus.BAD_GATEWAY,
    code: 'AUTH-007',
    message:
      '카카오 프로필 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  AUTH_USER_BLOCKED: {
    status: HttpStatus.FORBIDDEN,
    code: 'AUTH-008',
    message: '신고 누적으로 로그인이 제한되었습니다. 고객센터에 문의해 주세요.',
  },

  // VALID
  VALIDATION_INVALID_FORMAT: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 'VALID-001',
    message: '입력 형식이 올바르지 않습니다. 형식에 맞게 다시 입력해 주세요.',
  },
  VALIDATION_REQUIRED_FIELD_MISSING: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 'VALID-002',
    message: '필수 입력값이 누락되었습니다. 입력 내용을 확인해 주세요.',
  },

  // VOICE
  VOICE_RECORD_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    code: 'VOICE-001',
    message: '음성 녹음을 시작할 수 없습니다. 마이크 권한을 확인해 주세요.',
  },
  VOICE_TOO_SHORT: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 'VOICE-002',
    message: '조금 더 길게 말씀해 주세요. 최소 5초 이상 녹음이 필요합니다.',
  },
  VOICE_RECOGNITION_FAILED: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 'VOICE-003',
    message: '음성을 인식하지 못했습니다. 조금 더 크고 명확하게 말씀해 주세요.',
  },

  // MATCH
  MATCH_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'MATCH-001',
    message:
      '현재 조건에 맞는 상대를 찾지 못했습니다. 조건을 조정하거나 나중에 다시 시도해 보세요.',
  },
  ANALYSIS_DELAYED: {
    status: HttpStatus.ACCEPTED,
    code: 'MATCH-002',
    message: '음성 분석 중입니다. 잠시만 기다려 주세요.',
  },

  // SOCIAL
  SOCIAL_TARGET_USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SOCIAL-001',
    message: '대상 사용자를 찾을 수 없습니다. 사용자 정보를 확인해 주세요.',
  },
  SOCIAL_NO_BLOCKED: {
    status: HttpStatus.NOT_FOUND,
    code: 'SOCIAL-002',
    message: '차단한 대상이 없습니다.',
  },
  SOCIAL_BLOCK_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SOCIAL-003',
    message: '해당 차단 기록을 찾을 수 없습니다. 차단 목록을 확인해 주세요.',
  },
  SOCIAL_NO_HEART: {
    status: HttpStatus.NOT_FOUND,
    code: 'SOCIAL-004',
    message: '아직 기록되어있는 마음이 없습니다. 마음을 표현해보세요.',
  },
  SOCIAL_HEART_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SOCIAL-005',
    message: '해당 마음 기록을 찾을 수 없습니다. 마음 목록을 확인해 주세요.',
  },
  SOCIAL_HEART_ALREADY_EXISTS: {
    status: HttpStatus.CONFLICT,
    code: 'SOCIAL-006',
    message:
      '이미 마음을 표현한 사용자입니다. 다른 사용자에게 마음을 전해보세요.',
  },
  SOCIAL_REPORT_EXISTS: {
    status: HttpStatus.CONFLICT,
    code: 'SOCIAL-007',
    message: '이미 신고한 사용자입니다.',
  },
  SOCIAL_BLOCK_ALREADY_EXISTS: {
    status: HttpStatus.CONFLICT,
    code: 'SOCIAL_008',
    message: '이미 차단된 사용자입니다.',
  },

  // PROF
  PROFILE_NOT_REGISTERED: {
    status: HttpStatus.CONFLICT,
    code: 'PROF-001',
    message: '지금 바로 이상형 등록하고 내 취향에 맞는 프로필을 볼래요?',
  },

  // CHAT
  CHAT_MESSAGE_SEND_FAILED: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'CHAT-001',
    message: '메시지를 보내지 못했어요. 다시 시도해 주세요.',
  },
  CHAT_ROOM_ACCESS_FAILED: {
    status: HttpStatus.FORBIDDEN,
    code: 'CHAT-002',
    message: '채팅방을 불러올 수 없어요. 홈으로 이동해 주세요.',
  },

  // SYSTEM
  SERVER_TEMPORARY_ERROR: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'SYS-001',
    message: '잠시 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  },
  NETWORK_CONNECTION_FAILED: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'SYS-002',
    message: '인터넷 연결이 원활하지 않아요. 연결을 확인해 주세요.',
  },
} as const;

export type InternalErrorCode = keyof typeof ERROR_DEFINITIONS;
export type ExternalErrorCode =
  (typeof ERROR_DEFINITIONS)[InternalErrorCode]['code'];

export function getErrorDefinition(code: InternalErrorCode) {
  return ERROR_DEFINITIONS[code];
}

export const DEFAULT_ERROR: InternalErrorCode = 'SERVER_TEMPORARY_ERROR';
