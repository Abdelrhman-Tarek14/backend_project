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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    
    // 1. IP Validation (IP Allowlisting)
    // request.ip is reliable here because of 'trust proxy' in main.ts
    const clientIp = request.ip || request.socket.remoteAddress || '';
    
    // Support comma-separated IPs from configuration mapping
    const allowedIps = this.configService.get<string[]>('allowedWebhookIps', []);
    
    // If the list is NOT empty and the IP is NOT in the list, block it.
    // If the list IS empty, we allow any IP (standard behavior unless restricted).
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

    const secret = this.configService.get<string>('webhookSecret');
    if (!secret) {
      this.logger.error('WEBHOOK_SECRET is not configured!');
      throw new UnauthorizedException('Internal Configuration Error');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('Raw body not found. Ensure rawBody: true is set in main.ts');
      throw new UnauthorizedException('Missing payload');
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const computedSignature = hmac.update(rawBody).digest('hex');

      // Use timingSafeEqual with Buffer content to prevent timing attacks.
      // Both buffers MUST be the same length.
      const signatureBuffer = Buffer.from(signatureHeader, 'hex');
      const computedBuffer = Buffer.from(computedSignature, 'hex');

      if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
        this.logger.warn(`Signature mismatch. IP: ${clientIp}`);
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (e) {
      this.logger.error(`Signature validation failed: ${(e as Error).message}`);
      throw new UnauthorizedException('Invalid signature format');
    }

    return true;
  }
}
