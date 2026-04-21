import cron, { ScheduledTask } from 'node-cron';
import salesforceClient from '../integration/salesforce-client.js';
import backendClient from '../integration/backend-client.js';
import stateManager from '../core/state-manager.js';
import { SYNC_CRON, HEARTBEAT_CRON, PARSED_ALLOWED_CASE_TYPES } from '../config/env.js';
import { Logger } from '../core/logger.js';

class SyncService {
    private isSyncing: boolean;
    private sfSessionStatus: string | null;
    private logger = new Logger('SyncService');
    private syncTask: ScheduledTask | null = null;
    private heartbeatTask: ScheduledTask | null = null;
    public isStopping: boolean = false;

    constructor() {
        this.isSyncing = false;
        // Track Salesforce session status to only send heartbeat on state change
        this.sfSessionStatus = null; // null = unknown, 'OK' or 'SESSION_EXPIRED'
    }

    public async start(): Promise<void> {
        this.logger.info(`Starting scheduler. Sync CRON: [${SYNC_CRON}] | Heartbeat CRON: [${HEARTBEAT_CRON}]`);

        // Initial sync on startup before scheduling
        await this.sync();
        await this.sendHeartbeat();

        // Schedule recurring sync
        this.syncTask = cron.schedule(SYNC_CRON, async () => {
            if (this.isStopping) {
                this.logger.debug('Skipping scheduled sync: system is shutting down.');
                return;
            }
            await this.sync();
        });

        // Schedule recurring heartbeat
        this.heartbeatTask = cron.schedule(HEARTBEAT_CRON, async () => {
            if (this.isStopping) {
                this.logger.debug('Skipping scheduled heartbeat: system is shutting down.');
                return;
            }
            await this.sendHeartbeat();
        });
    }

    public stop(): void {
        this.logger.info('Stopping scheduled tasks and initiating graceful shutdown...');
        this.isStopping = true;
        this.syncTask?.stop();
        this.heartbeatTask?.stop();
    }


    public async sync(): Promise<void> {
        if (this.isSyncing || this.isStopping) return;
        this.isSyncing = true;

        try {
            this.logger.info('🔄 Syncing with Salesforce...');

            const allOpenCases = await salesforceClient.fetchOpenCasesReport();

            // --- SF Session is healthy ---
            await this.reportSfSession('OK');

            // Filter only the required types as defined in the config/env
            const currentOpenCases = allOpenCases.filter(c =>
                PARSED_ALLOWED_CASE_TYPES.includes(c.caseType)
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
                this.logger.info(`📉 Found ${toClose.length} cases to close or reset.`);
                for (const { item, reason } of toClose) {
                    const success = await backendClient.closeCase(item);
                    if (success) {
                        if (reason === 'GONE') stateManager.removeCase(item.caseNumber);
                        this.logger.info(`✅ [CLOSE:${reason}] Case ${item.caseNumber} closed.`);
                    } else {
                        this.logger.error(`⚠️ [CLOSE:${reason}] Case ${item.caseNumber} failed to close.`);
                    }
                }
            }

            // 3. Execute Actions: SYNC SECOND (Creation/Update phase)
            if (toSync.length > 0) {
                this.logger.info(`🚀 Found ${toSync.length} cases to sync.`);
                for (const { item, reason } of toSync) {
                    const success = await backendClient.syncCase(item);
                    if (success) {
                        stateManager.updateCase(item.caseNumber, item);
                        this.logger.info(`✅ [SYNC:${reason}] Case ${item.caseNumber} synced.`);
                    } else {
                        this.logger.error(`⚠️ [SYNC:${reason}] Case ${item.caseNumber} failed to sync.`);
                    }
                }
            }

            if (toSync.length === 0 && toClose.length === 0) {
                this.logger.info('✅ No changes detected in open cases.');
            }

            // Update only the last sync timestamp
            stateManager.updateLastSync();

            this.logger.info(`✨ Sync completed. Total Open in Salesforce: ${currentOpenCases.length}`);

        } catch (err: any) {
            this.logger.error(`Sync failed: ${err.message}`);
            // --- SF Session is down (expired or unreachable) ---
            await this.reportSfSession('SESSION_EXPIRED');

        } finally {
            this.isSyncing = false;
        }
    }

    private async reportSfSession(newStatus: string): Promise<void> {
        if (this.sfSessionStatus === newStatus) return; // No change, skip

        const previousStatus = this.sfSessionStatus;
        this.sfSessionStatus = newStatus;

        if (newStatus === 'OK') {
            this.logger.info(`💚 [SfSession] Salesforce session is ${previousStatus === null ? 'confirmed OK' : 'RESTORED'}. Notifying backend.`);
        } else {
            this.logger.warn(`🔴 [SfSession] Salesforce session STATUS CHANGED: ${previousStatus ?? 'unknown'} → ${newStatus}. Notifying backend.`);
        }

        await backendClient.sendHeartbeat(newStatus);
    }

    public async sendHeartbeat(): Promise<void> {
        try {
            const success = await backendClient.sendHeartbeat(this.sfSessionStatus ?? 'OK');
            if (success) {
                this.logger.info(`💓 Heartbeat sent to backend.`);
            } else {
                this.logger.error(`💔 Heartbeat failed after retries. Backend might be unreachable.`);
            }
        } catch (err: any) {
            this.logger.error(`Heartbeat error: ${err.message}`);
        }
    }

    // Add explicitly returning isSyncing so gracefully shutdown can wait
    public get IsSyncing(): boolean {
        return this.isSyncing;
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
