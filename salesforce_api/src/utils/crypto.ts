import * as crypto from 'crypto';

export function generateSignature(payload: string | object, secret: string): string {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}
