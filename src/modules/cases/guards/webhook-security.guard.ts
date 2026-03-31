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
    
    // 1. IP Validation
    const clientIp = request.ip || request.connection?.remoteAddress || '';
    const allowedIps = this.configService.get<string[]>('allowedWebhookIps', []);
    
    if (!allowedIps.includes(clientIp)) {
      this.logger.warn(`Blocked webhook attempt from unauthorized IP: ${clientIp}`);
      throw new ForbiddenException('Unauthorized IP Address');
    }

    // 2. Signature Validation
    const signatureHeader = request.headers['x-webhook-signature'];
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      this.logger.warn('Missing or invalid webhook signature header');
      throw new UnauthorizedException('Missing signature');
    }

    const secret = this.configService.get<string>('webhookSecret');
    if (!secret) {
      this.logger.error('Webhook secret is not configured!');
      throw new UnauthorizedException('Internal Configuration Error');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('Raw body not found. Make sure rawBody: true is set in NestFactory.create()');
      throw new UnauthorizedException('Missing payload');
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const computedSignature = hmac.update(rawBody).digest('hex');

      // Use timingSafeEqual to prevent timing attacks
      if (!crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signatureHeader))) {
        this.logger.warn('Signature mismatch. Possible tampering attempt.');
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (e) {
      this.logger.error(`Signature validation failed: ${(e as Error).message}`);
      throw new UnauthorizedException('Invalid signature format');
    }

    return true; // Passed both IP and Signature checks
  }
}
