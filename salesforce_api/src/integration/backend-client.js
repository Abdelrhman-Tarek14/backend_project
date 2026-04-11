const axios = require('axios');
const { BACKEND_URL, WEBHOOK_SECRET } = require('../config/env');
const { generateSignature } = require('../utils/crypto');

class BackendClient {
    constructor() {
        this.baseUrl = BACKEND_URL;
        this.secret = WEBHOOK_SECRET;
    }

    async syncCase(caseData) {
        const url = `${this.baseUrl}/cases/webhook/salesforce`;
        const result = await this.sendRequest('POST', url, caseData);
        return result !== null;
    }

    async closeCase(caseData) {
        const url = `${this.baseUrl}/cases/webhook/salesforce/close`;
        const payload = {
            caseNumber: caseData.caseNumber,
            caseOwner: caseData.caseOwner
        };
        const result = await this.sendRequest('POST', url, payload);
        return result !== null;
    }

    async sendHeartbeat() {
        const url = `${this.baseUrl}/cases/webhook/salesforce/heartbeat`;
        const payload = { timestamp: new Date().toISOString(), status: 'OK' };
        const result = await this.sendRequest('POST', url, payload);
        return result !== null;
    }

    async sendRequest(method, url, payload, retries = 3) {
        const rawBody = JSON.stringify(payload);
        const signature = generateSignature(rawBody, this.secret);
        const endpoint = url.replace(this.baseUrl, '');

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
                return response.data;
            } catch (err) {
                const status = err.response?.status;
                const message = err.response?.data?.message || err.message;
                
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

module.exports = new BackendClient();
