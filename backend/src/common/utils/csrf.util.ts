import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';

let csrfInstance: ReturnType<typeof doubleCsrf> | null = null;

export const initializeDoubleCsrf = (configService: ConfigService) => {
  if (csrfInstance) return csrfInstance;

  const secret = configService.getOrThrow<string>('auth.csrfSecret');

  csrfInstance = doubleCsrf({
    getSecret: () => secret,
    // Use the access_token cookie as the session identifier so each user gets
    // their own CSRF token bound to their session, instead of a shared static string.
    // Falls back to req.ip for unauthenticated requests (e.g. fetching CSRF before login).
    getSessionIdentifier: (req) => {
      const sessionId = (req as any).cookies?.['access_token'];
      return sessionId || req.ip || 'anonymous';
    },
    // Plain cookie name (no __Host- prefix) — __Host- requires the cookie to be sent
    // over HTTPS at the network level. Cloudflare Tunnel terminates TLS externally and
    // forwards plain HTTP to Nginx/NestJS, so __Host- would be silently rejected by the browser.
    cookieName: 'csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: configService.get('nodeEnv') === 'production',
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
