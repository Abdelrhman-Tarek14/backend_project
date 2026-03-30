import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GasWebhookGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-gas-api-key'];
    
    const validSecret = this.configService.get<string>('gasWebhookSecret');

    if (!apiKey || apiKey !== validSecret) {
      throw new UnauthorizedException('Invalid or missing Google Apps Script Secret Token');
    }

    return true;
  }
}
