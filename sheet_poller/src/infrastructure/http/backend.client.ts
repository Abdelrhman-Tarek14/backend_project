import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
import * as crypto from 'crypto';
import { BACKEND_CONFIG } from '../../core/config/env.js';
import { Logger } from '../../core/logger.js';
import { BackendCasePayload } from '../../interfaces/case.interface.js';

export class BackendClient {
  private axiosInstance: AxiosInstance;
  private logger = new Logger('BackendClient');

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BACKEND_CONFIG.WEBHOOK_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.logger.info('Initialized');
  }

  private generateSignature(body: string): string {
    return crypto
      .createHmac('sha256', BACKEND_CONFIG.GAS_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
  }

  /**
   * Sends valid rows to the backend.
   */
  async sendPayload(payload: BackendCasePayload[]): Promise<boolean> {
    if (payload.length === 0) return true;

    try {
      // Send sequential requests for now as per legacy behavior
      // but could be optimized if backend supports arrays.
      for (const item of payload) {
        const body = JSON.stringify(item);
        const signature = this.generateSignature(body);

        await this.axiosInstance.post('', body, {
          headers: {
            'x-webhook-signature': signature,
          },
        });
      }

      this.logger.info(`Successfully synced ${payload.length} items`);
      return true;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData || error.message;
      this.logger.error('Sync failed', errorMessage);
      return false;
    }
  }
}
