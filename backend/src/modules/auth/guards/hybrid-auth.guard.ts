import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MANAGEMENT_ROLES } from '../../../common/constants/roles.constants';

@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Try Internal API Key first
    const apiKey = request.headers['x-internal-api-key'];
    const secret = this.configService.get<string>('integrations.salesforceWebhookSecret');
    
    if (apiKey && apiKey === secret) {
      return true;
    }

    // 2. Try JWT Session (from cookies)
    const token = request.cookies?.['access_token'];
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('jwt.secret'),
        });
        
        // Ensure the user has management roles
        if (payload && MANAGEMENT_ROLES.includes(payload.role)) {
          request.user = payload; // Attach user to request for convenience
          return true;
        }
      } catch (e) {
        // Token invalid, continue to throw
      }
    }

    throw new UnauthorizedException('Invalid or missing credentials (Internal API Key or Admin Session required)');
  }
}
