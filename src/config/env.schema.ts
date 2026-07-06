import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  CORS_ORIGIN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_S3_BUCKET: z.string().min(1),
  CHAT_MEDIA_BUCKET: z.string().min(1),
  MEDIA_PUT_PRESIGN_EXPIRES_SEC: z.coerce.number().int().positive(),
  MEDIA_GET_PRESIGN_EXPIRES_SEC: z.coerce.number().int().positive(),
  FASTAPI_BASE_URL: z.string().url(),
  FASTAPI_TIMEOUT_MS: z.coerce.number().int().positive(),
  S3_GET_PRESIGN_EXPIRES_SEC: z.coerce.number().int().positive().optional(),
  FASTAPI_PROFILE_ANALYSIS_PATH: z
    .string()
    .min(1)
    .default('/api/v1/onboarding/voice-profile/analyze'),
  FASTAPI_CLUB_VIBE_ANALYSIS_PATH: z
    .string()
    .min(1)
    .default('/api/v1/onboarding/club-vibe/analyze'),
  FASTAPI_MATCH_RECOMMEND_PATH: z
    .string()
    .min(1)
    .default('/api/v1/onboarding/matches/recommend'),
  FASTAPI_CLUB_RECOMMEND_PATH: z
    .string()
    .min(1)
    .default('/api/v1/recommendation/clubs'),
  FASTAPI_HEALTH_URL: z.string().url(),
  FASTAPI_HEALTH_PATH: z.string().min(1).default('/health'),
  KAKAO_CLIENT_ID: z.string().min(1),
  KAKAO_CLIENT_SECRET: z.string().min(1),
  APPLE_TEAM_ID: z.string().min(1),
  APPLE_KEY_ID: z.string().min(1),
  APPLE_CLIENT_ID: z.string().min(1),
  APPLE_WEB_CLIENT_ID: z.string().min(1).optional(),
  APPLE_REDIRECT_URI: z.string().url().optional(),
  APPLE_WEB_LOGIN_ENABLED: z.enum(['true', 'false']).default('false'),
  APPLE_PRIVATE_KEY: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;
