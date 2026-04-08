import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';

let csrfInstance: ReturnType<typeof doubleCsrf> | null = null;

export const initializeDoubleCsrf = (configService: ConfigService) => {
  if (csrfInstance) return csrfInstance;

  const isProduction = configService.get<string>('nodeEnv') === 'production';
  const secret = configService.getOrThrow<string>('auth.csrfSecret');

  csrfInstance = doubleCsrf({
    getSecret: () => secret,
    getSessionIdentifier: (req) => {
        const sessionId = (req as any).cookies?.['access_token'];
        return sessionId || (isProduction ? req.ip : 'dev-session-id');
    },
    cookieName: isProduction ? '__Host-csrf' : 'csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
    },
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
  });

  return csrfInstance;
};

export const getDoubleCsrfInstance = () => {
  if (!csrfInstance) {
    throw new Error('CSRF Instance not initialized. Call initializeDoubleCsrf first.');
  }
  return csrfInstance;
};
