import axios from 'axios';
import { BACKEND_URL, SALESFORCE_WEBHOOK_SECRET } from '../config/env.js';
import { generateSignature } from '../utils/crypto.js';

class BackendClient {
    private baseUrl: string | undefined;
    private secret: string | undefined;
    private lastSyncStatus: number | null;

    constructor() {
        this.baseUrl = BACKEND_URL;
        this.secret = SALESFORCE_WEBHOOK_SECRET;
        this.lastSyncStatus = null; // Tracks last HTTP status of POST /webhook/salesforce
    }

    public async syncCase(caseData: any): Promise<boolean> {
        const url = `${this.baseUrl}/cases/webhook/salesforce`;
        const result = await this.sendRequest('POST', url, caseData);
        return result !== null;
    }

    public async closeCase(caseData: any): Promise<boolean> {
        const url = `${this.baseUrl}/cases/webhook/salesforce/close`;
        const payload = {
            caseNumber: caseData.caseNumber,
            caseOwner: caseData.caseOwner
        };
        const result = await this.sendRequest('POST', url, payload);
        return result !== null;
    }

    public async sendHeartbeat(sfSessionStatus: string = 'OK'): Promise<boolean> {
        const url = `${this.baseUrl}/cases/webhook/salesforce/heartbeat`;
        const payload = {
            timestamp: new Date().toISOString(),
            status: sfSessionStatus,       // Salesforce session health: 'OK' or 'SESSION_EXPIRED'
            lastSyncStatus: this.lastSyncStatus
        };
        const result = await this.sendRequest('POST', url, payload);
        return result !== null;
    }

    private async sendRequest(method: string, url: string, payload: any, retries: number = 3): Promise<any> {
        const rawBody = JSON.stringify(payload);
        const signature = generateSignature(rawBody, this.secret || '');
        const endpoint = url.replace(this.baseUrl || '', '');
        const isSyncEndpoint = endpoint === '/cases/webhook/salesforce';

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`   🔄 [BackendClient] Retrying ${endpoint} (Attempt ${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
                } else {
                    console.log(`\n📤 [BackendClient] Sending ${method} to ${endpoint}`);
                }

                const response = await axios({
                    method,
                    url,
                    data: rawBody,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-webhook-signature': signature
                    },
                    timeout: 5000 // 5s timeout
                });

                // Track successful sync status
                if (isSyncEndpoint) this.lastSyncStatus = response.status;
                return response.data;
            } catch (err: any) {
                const status = err.response?.status;
                const message = err.response?.data?.message || err.message;

                // Track failed sync status
                if (isSyncEndpoint && status) this.lastSyncStatus = status;

                console.error(`   ❌ [BackendClient] Attempt ${attempt} failed: ${message}`);

                // Don't retry if it's a client error (4xx) except 429
                if (status >= 400 && status < 500 && status !== 429) {
                    break;
                }

                if (attempt === retries) {
                    console.error(`   🛑 [BackendClient] All ${retries} attempts failed for ${endpoint}.`);
                }
            }
        }
        return null;
    }
}

export default new BackendClient();
