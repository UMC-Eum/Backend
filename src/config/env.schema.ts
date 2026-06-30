import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_S3_BUCKET: z.string().min(1),
  FASTAPI_BASE_URL: z.string().url().default('http://fastapi.eum.local:8000'),
  FASTAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  FASTAPI_PROFILE_ANALYSIS_PATH: z
    .string()
    .min(1)
    .default('/api/v1/onboarding/voice-profile/analyze'),
  FASTAPI_MATCH_RECOMMEND_PATH: z
    .string()
    .min(1)
    .default('/api/v1/onboarding/matches/recommend'),
  FASTAPI_CLUB_RECOMMEND_PATH: z
    .string()
    .min(1)
    .default('/api/v1/recommendation/clubs'),
  FASTAPI_HEALTH_URL: z
    .string()
    .url()
    .default('http://fastapi.eum.local:8000/health'),
  FASTAPI_HEALTH_PATH: z.string().min(1).default('/health'),
  KAKAO_CLIENT_ID: z.string().min(1),
  KAKAO_CLIENT_SECRET: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret'),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('14d'),
});

export type Env = z.infer<typeof envSchema>;
