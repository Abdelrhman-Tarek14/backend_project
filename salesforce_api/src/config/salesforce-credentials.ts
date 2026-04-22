import axios from 'axios';
import { ACTIVE_BACKEND_URL, SALESFORCE_WEBHOOK_SECRET } from './env.js';
import { Logger } from '../core/logger.js';
import backendClient from '../integration/backend-client.js';

export interface SalesforceCredentials {
  auraToken: string;
  cookie: string;
  auraContext: string;
  sfdcPageScopeId: string;
}

class SalesforceCredentialsManager {
  private credentials: SalesforceCredentials | null = null;
  private logger = new Logger('CredentialsManager');
  private isRefreshing = false;

  public async init() {
    this.logger.info('Initializing Salesforce credentials from backend...');
    await this.refresh();
  }

  public async refresh() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      this.logger.info('Fetching fresh Salesforce credentials from backend...');
      const response = await axios.get(`${ACTIVE_BACKEND_URL}/system/config/salesforce`, {
        headers: {
          'x-internal-api-key': SALESFORCE_WEBHOOK_SECRET
        },
        timeout: 5000
      });

      const data = response.data;
      
      // Basic validation
      if (!data.auraToken || !data.cookie) {
        throw new Error('Received incomplete credentials from backend');
      }

      this.credentials = {
        auraToken: data.auraToken,
        cookie: data.cookie,
        auraContext: data.auraContext || '',
        sfdcPageScopeId: data.sfdcPageScopeId || ''
      };

      this.logger.info('✅ Salesforce credentials successfully updated from database');
    } catch (err: any) {
      this.logger.error(`❌ Failed to refresh Salesforce credentials: ${err.message}`);
      
      // If refresh fails, the DB credentials might be missing or backend is down.
      // Update system status to ERROR so it reflects on the dashboard.
      await backendClient.sendHeartbeat('ERROR');
      
      this.logger.error('CRITICAL: Salesforce credentials in database are expired or missing. Please update via System Health page.');
    } finally {
      this.isRefreshing = false;
    }
  }

  public getCredentials(): SalesforceCredentials {
    if (!this.credentials) {
      // Return empty strings instead of null to prevent immediate crashes, 
      // but the 401 logic will trigger a refresh.
      return {
        auraToken: '',
        cookie: '',
        auraContext: '',
        sfdcPageScopeId: ''
      };
    }
    return this.credentials;
  }
}

export const credentialsManager = new SalesforceCredentialsManager();
