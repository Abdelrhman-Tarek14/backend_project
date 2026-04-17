import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemService } from '../../modules/system/system.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MANAGEMENT_ROLES } from '../constants/roles.constants';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly systemService: SystemService,
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

    // 2. Check current maintenance status
    const { enabled } = await this.systemService.getMaintenanceStatus();

    if (!enabled) {
      return true;
    }

    // 3. Maintenance is active: Check for Admin Bypass
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // We assume JwtAuthGuard has already run for protected routes
    // and attached the user object.
    if (user && MANAGEMENT_ROLES.includes(user.role)) {
      return true;
    }

    // 4. Block access with 503 Service Unavailable
    throw new ServiceUnavailableException(
      'The system is currently undergoing maintenance. Please try again later.',
    );
  }
}
