import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];

    // Reuse the existing SALESFORCE_WEBHOOK_SECRET as the internal API key
    const secret = this.configService.get<string>('integrations.salesforceWebhookSecret');

    if (!apiKey || apiKey !== secret) {
      throw new UnauthorizedException('Invalid or missing internal API key');
    }

    return true;
  }
}
