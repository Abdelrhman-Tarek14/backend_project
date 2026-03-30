import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SalesforceWebhookGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-sf-api-key'];
    
    const validSecret = this.configService.get<string>('salesforceWebhookSecret');

    if (!apiKey || apiKey !== validSecret) {
      throw new UnauthorizedException('Invalid or missing Salesforce API Key');
    }

    return true;
  }
}
