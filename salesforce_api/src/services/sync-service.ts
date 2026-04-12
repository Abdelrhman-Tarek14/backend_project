import salesforceClient from '../integration/salesforce-client.js';
import backendClient from '../integration/backend-client.js';
import stateManager from '../core/state-manager.js';
import { POLL_INTERVAL, HEARTBEAT_INTERVAL, ALLOWED_CASE_TYPES } from '../config/env.js';

class SyncService {
    private isSyncing: boolean;
    private sfSessionStatus: string | null;

    constructor() {
        this.isSyncing = false;
        // Track Salesforce session status to only send heartbeat on state change
        this.sfSessionStatus = null; // null = unknown, 'OK' or 'SESSION_EXPIRED'
    }

    public async start(): Promise<void> {
        console.log(`[SyncService] Started. Polling every ${POLL_INTERVAL / 1000}s. Heartbeat every ${HEARTBEAT_INTERVAL / 1000}s.`);
        
        // Initial sync
        await this.sync();
        await this.sendHeartbeat();

        // Intervals
        setInterval(() => this.sync(), POLL_INTERVAL);
        setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL);
    }

    public async sync(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            console.log(`\n[${new Date().toLocaleTimeString()}] 🔄 Syncing with Salesforce...`);
            
            const allOpenCases = await salesforceClient.fetchOpenCasesReport();

            // --- SF Session is healthy ---
            await this.reportSfSession('OK');
            
            // Filter only the required types as defined in the config/env
            const currentOpenCases = allOpenCases.filter(c => 
                ALLOWED_CASE_TYPES.includes(c.caseType)
            );

            const previousState = stateManager.getCases();
            
            const currentMap: Record<string, any> = {};
            currentOpenCases.forEach(c => currentMap[c.caseNumber] = c);

            // 1. Detect Changes
            const toSync: { item: any; reason: string }[] = [];  // New or New Versions of Updated
            const toClose: { item: any; reason: string }[] = []; // Removed or Old Versions of Updated

            // Find New/Updated
            currentOpenCases.forEach(c => {
                const prev = previousState[c.caseNumber];
                if (!prev) {
                    toSync.push({ item: c, reason: 'NEW' });
                } else if (this.hasChanged(prev, c)) {
                    toClose.push({ item: prev, reason: 'UPDATE_RESET' });
                    toSync.push({ item: c, reason: 'UPDATED' });
                }
            });

            // Find Truly Closed (In previousState but not in currentMap)
            Object.values(previousState).forEach(prev => {
                if (!currentMap[prev.caseNumber]) {
                    toClose.push({ item: prev, reason: 'GONE' });
                }
            });

            // 2. Execute Actions: CLOSE FIRST (Cleanup phase)
            if (toClose.length > 0) {
                console.log(`📉 Found ${toClose.length} cases to close or reset.`);
                for (const { item, reason } of toClose) {
                    const success = await backendClient.closeCase(item);
                    if (success) {
                        if (reason === 'GONE') stateManager.removeCase(item.caseNumber);
                        console.log(`   ✅ [CLOSE:${reason}] Case ${item.caseNumber} closed.`);
                    } else {
                        console.error(`   ⚠️ [CLOSE:${reason}] Case ${item.caseNumber} failed to close.`);
                    }
                }
            }

            // 3. Execute Actions: SYNC SECOND (Creation/Update phase)
            if (toSync.length > 0) {
                console.log(`🚀 Found ${toSync.length} cases to sync.`);
                for (const { item, reason } of toSync) {
                    const success = await backendClient.syncCase(item);
                    if (success) {
                        stateManager.updateCase(item.caseNumber, item);
                        console.log(`   ✅ [SYNC:${reason}] Case ${item.caseNumber} synced.`);
                    } else {
                        console.error(`   ⚠️ [SYNC:${reason}] Case ${item.caseNumber} failed to sync.`);
                    }
                }
            }

            if (toSync.length === 0 && toClose.length === 0) {
                console.log('✅ No changes detected in open cases.');
            }

            // Update only the last sync timestamp
            stateManager.updateLastSync();
            
            console.log(`✨ Sync completed. Total Open in Salesforce: ${currentOpenCases.length}`);

        } catch (err: any) {
            console.error('[SyncService] Sync failed:', err.message);
            // --- SF Session is down (expired or unreachable) ---
            await this.reportSfSession('SESSION_EXPIRED');
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Reports the Salesforce session status to the backend via heartbeat.
     * Only sends a heartbeat when the status CHANGES (OK -> SESSION_EXPIRED or vice versa).
     */
    private async reportSfSession(newStatus: string): Promise<void> {
        if (this.sfSessionStatus === newStatus) return; // No change, skip

        const previousStatus = this.sfSessionStatus;
        this.sfSessionStatus = newStatus;

        if (newStatus === 'OK') {
            console.log(`💚 [SfSession] Salesforce session is ${previousStatus === null ? 'confirmed OK' : 'RESTORED'}. Notifying backend.`);
        } else {
            console.warn(`🔴 [SfSession] Salesforce session STATUS CHANGED: ${previousStatus ?? 'unknown'} → ${newStatus}. Notifying backend.`);
        }

        await backendClient.sendHeartbeat(newStatus);
    }

    public async sendHeartbeat(): Promise<void> {
        try {
            const success = await backendClient.sendHeartbeat(this.sfSessionStatus ?? 'OK');
            if (success) {
                console.log(`💓 [${new Date().toLocaleTimeString()}] Heartbeat sent to backend.`);
            } else {
                console.error(`💔 [${new Date().toLocaleTimeString()}] Heartbeat failed after retries. Backend might be unreachable.`);
            }
        } catch (err: any) {
            console.error('[SyncService] Heartbeat error:', err.message);
        }
    }

    private hasChanged(oldCase: any, newCase: any): boolean {
        // Compare key fields that determine if it's a "significant" change
        return (
            oldCase.caseOwner !== newCase.caseOwner ||
            oldCase.caseType !== newCase.caseType
        );
    }
}

export default new SyncService();
