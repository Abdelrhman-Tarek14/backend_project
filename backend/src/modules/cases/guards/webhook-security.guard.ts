import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Injectable()
export class WebhookSecurityGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSecurityGuard.name);

  constructor(private configService: ConfigService) {}

  private normalizeIp(ip: string): string {
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  }

  private getSecretForRoute(request: Request): string | undefined {
    const url = request.url;
    
    if (url.includes('salesforce')) {
      return this.configService.get<string>('integrations.salesforceWebhookSecret');
    }
    
    if (url.includes('gas')) {
      return this.configService.get<string>('integrations.gasWebhookSecret');
    }

    return undefined;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();

    // 1. IP Validation
    const clientIp = this.normalizeIp(request.ip || '');
    const allowedIps = this.configService.get<string[]>('integrations.allowedWebhookIps', []);

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      this.logger.warn(`Blocked webhook attempt from unauthorized IP: ${clientIp}`);
      throw new ForbiddenException('Unauthorized IP Address');
    }

    // 2. Signature Validation (HMAC)
    const signatureHeader = request.headers['x-webhook-signature'];
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      this.logger.warn('Missing or invalid webhook signature header');
      throw new UnauthorizedException('Missing signature');
    }

    const secret = this.getSecretForRoute(request);
    if (!secret) {
      this.logger.error(`Webhook secret is not configured for route: ${request.url}`);
      throw new UnauthorizedException('Internal Configuration Error');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('Raw body not found. Ensure rawBody: true is set in main.ts');
      throw new UnauthorizedException('Missing payload');
    }

    let signatureBuffer: Buffer;
    try {
      signatureBuffer = Buffer.from(signatureHeader, 'hex');
      if (signatureBuffer.length === 0) {
        throw new Error('Invalid hex signature');
      }
    } catch {
      this.logger.warn(`Invalid signature format from IP: ${clientIp}`);
      throw new UnauthorizedException('Invalid signature format');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const computedSignature = hmac.update(rawBody).digest('hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');

    if (
      signatureBuffer.length !== computedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, computedBuffer)
    ) {
      this.logger.warn(`Signature mismatch from IP: ${clientIp}`);
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}