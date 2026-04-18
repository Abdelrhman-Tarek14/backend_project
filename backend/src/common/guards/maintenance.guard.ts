import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SystemService } from '../../modules/system/system.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MANAGEMENT_ROLES } from '../constants/roles.constants';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly systemService: SystemService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the route is public (e.g., status check, login)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 1.5. Whitelist check for CSRF and Auth endpoints to allow login during maintenance
    const request = context.switchToHttp().getRequest();
    const path = request.path;

    if (path === '/csrf' || path.startsWith('/auth/')) {
      return true;
    }

    // 2. Extract and Validating JWT for Admin Bypass
    
    // Check if user is already attached (e.g. by another guard)
    let user = request.user;

    if (!user) {
      const token = this.extractCookie(request.headers.cookie, 'access_token');
      if (token) {
        try {
          const secret = this.configService.get<string>('jwt.accessSecret');
          user = await this.jwtService.verifyAsync(token, { secret });
          request.user = user; // Attach for potential use in subsequent guards
        } catch (e) {
          // Token invalid or expired, proceed to block
        }
      }
    }

    // Bypass if user is a manager/admin
    if (user && MANAGEMENT_ROLES.includes(user.role)) {
      return true;
    }

    // 3. Check current maintenance status
    const { enabled } = await this.systemService.getMaintenanceStatus();

    if (!enabled) {
      return true;
    }

    // 4. Block access with 503 Service Unavailable
    throw new ServiceUnavailableException(
      'The system is currently undergoing maintenance. Please try again later.',
    );
  }

  private extractCookie(cookieString: string | undefined, key: string): string | undefined {
    if (!cookieString) return undefined;
    const cookies = cookieString.split(';').reduce((acc: any, cookie) => {
      const parts = cookie.trim().split('=');
      const name = parts.shift();
      const value = parts.join('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    return cookies[key];
  }
}
