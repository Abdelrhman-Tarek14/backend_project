import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
import * as crypto from 'crypto';
import { BACKEND_CONFIG } from '../../core/config/env.js';
import { Logger } from '../../core/logger.js';
import { BackendCasePayload } from '../../interfaces/case.interface.js';

import http from 'http';
import https from 'https';

export class BackendClient {
  private axiosInstance: AxiosInstance;
  private logger = new Logger('BackendClient');

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BACKEND_CONFIG.WEBHOOK_URL_FORM,
      headers: {
        'Content-Type': 'application/json',
      },
      // Use Keep-Alive to prevent socket exhaustion and Event Listener leaks in loops
      httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
      httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
    });
    this.logger.info('Initialized');
  }

  private generateSignature(body: string): string {
    return crypto
      .createHmac('sha256', BACKEND_CONFIG.SHEET_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
  }

  /**
   * Helper to retry a function with a limit.
   */
  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      this.logger.warn(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
  }

  /**
   * Sends valid rows to the backend.
   */
  async sendPayload(payload: BackendCasePayload[]): Promise<boolean> {
    if (payload.length === 0) return true;

    try {
      for (const item of payload) {
        const body = JSON.stringify(item);
        const signature = this.generateSignature(body);

        await this.withRetry(() => this.axiosInstance.post('', body, {
          headers: {
            'x-webhook-signature': signature,
          },
        }));
      }

      this.logger.info(`Successfully synced ${payload.length} items`);
      return true;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData || error.message;
      this.logger.error('Sync failed after retries', errorMessage);
      return false;
    }
  }
}

