const salesforceClient = require('../integration/salesforce-client');
const backendClient = require('../integration/backend-client');
const stateManager = require('../core/state-manager');
const { POLL_INTERVAL, HEARTBEAT_INTERVAL, ALLOWED_CASE_TYPES } = require('../config/env');

class SyncService {
    constructor() {
        this.isSyncing = false;
    }

    async start() {
        console.log(`[SyncService] Started. Polling every ${POLL_INTERVAL / 1000}s. Heartbeat every ${HEARTBEAT_INTERVAL / 1000}s.`);
        
        // Initial sync
        await this.sync();
        await this.sendHeartbeat();

        // Intervals
        setInterval(() => this.sync(), POLL_INTERVAL);
        setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL);
    }

    async sync() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            console.log(`\n[${new Date().toLocaleTimeString()}] 🔄 Syncing with Salesforce...`);
            
            const allOpenCases = await salesforceClient.fetchOpenCasesReport();
            
            // Filter only the required types as defined in the config/env
            const currentOpenCases = allOpenCases.filter(c => 
                ALLOWED_CASE_TYPES.includes(c.caseType)
            );

            const previousState = stateManager.getCases();
            
            const currentMap = {};
            currentOpenCases.forEach(c => currentMap[c.caseNumber] = c);

            // 1. Find New or Updated Cases
            const toSync = [];
            currentOpenCases.forEach(c => {
                const prev = previousState[c.caseNumber];
                
                if (!prev) {
                    // New case
                    toSync.push({ item: c, reason: 'NEW' });
                } else if (this.hasChanged(prev, c)) {
                    // Updated case
                    toSync.push({ item: c, reason: 'UPDATED' });
                }
            });

            // 2. Find Closed Cases (In previousState but not in currentMap)
            const toClose = Object.values(previousState).filter(prev => !currentMap[prev.caseNumber]);

            // Execute Actions
            if (toSync.length > 0) {
                console.log(`🚀 Found ${toSync.length} cases to sync (${toSync.filter(x => x.reason === 'NEW').length} new, ${toSync.filter(x => x.reason === 'UPDATED').length} updated).`);
                for (const { item, reason } of toSync) {
                    const success = await backendClient.syncCase(item);
                    if (success) {
                        stateManager.updateCase(item.caseNumber, item);
                        console.log(`   ✅ [${reason}] Case ${item.caseNumber} synced & state updated.`);
                    } else {
                        console.error(`   ⚠️ [${reason}] Case ${item.caseNumber} failed to sync. Will retry in next poll.`);
                    }
                }
            } else {
                console.log('✅ No changes detected in open cases.');
            }

            if (toClose.length > 0) {
                console.log(`📉 Found ${toClose.length} cases to close.`);
                for (const item of toClose) {
                    const success = await backendClient.closeCase(item);
                    if (success) {
                        stateManager.removeCase(item.caseNumber);
                        console.log(`   ✅ [CLOSED] Case ${item.caseNumber} closed & state removed.`);
                    } else {
                        console.error(`   ⚠️ [CLOSED] Case ${item.caseNumber} failed to close. Will retry in next poll.`);
                    }
                }
            }

            // Update only the last sync timestamp
            stateManager.updateLastSync();
            
            console.log(`✨ Sync completed. Total Open in Salesforce: ${currentOpenCases.length}`);

        } catch (err) {
            console.error('[SyncService] Sync failed:', err.message);
        } finally {
            this.isSyncing = false;
        }
    }

    async sendHeartbeat() {
        try {
            const success = await backendClient.sendHeartbeat();
            if (success) {
                console.log(`💓 [${new Date().toLocaleTimeString()}] Heartbeat sent to backend.`);
            } else {
                console.error(`💔 [${new Date().toLocaleTimeString()}] Heartbeat failed after retries. Backend might be unreachable.`);
            }
        } catch (err) {
            console.error('[SyncService] Heartbeat error:', err.message);
        }
    }

    hasChanged(oldCase, newCase) {
        // Compare key fields that determine if it's a "significant" change
        return (
            oldCase.caseOwner !== newCase.caseOwner ||
            oldCase.caseType !== newCase.caseType
            // Note: caseStartTime or lastUpdate might change but we care about Ownership and Status
        );
    }
}

module.exports = new SyncService();
