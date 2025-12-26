import pino from 'pino';

export function createPinoLogger() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const level = process.env.LOG_LEVEL ?? 'info';

  return pino({
    level,
    transport:
      nodeEnv !== 'production'
        ? {
            target: 'pino-pretty',
            options: { singleLine: true },
          }
        : undefined,
  });
}
