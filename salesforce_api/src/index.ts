import syncService from './services/sync-service.js';
import { Logger } from './core/logger.js';

const logger = new Logger('Main');

logger.info('====================================================');
logger.info('   Salesforce API Integration Service Starting...   ');
logger.info('====================================================');

// Shutdown handler
const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    
    // Stop intervals
    syncService.stop();

    // Wait until current sync cycle finishes
    const checkInterval = setInterval(() => {
        if (!syncService.IsSyncing) {
            clearInterval(checkInterval);
            logger.info('Sync Service is idle. Exiting safely.');
            process.exit(0);
        } else {
            logger.info('Sync in progress... waiting to finish before exiting.');
        }
    }, 1000);

    // Force exit after 30 seconds
    setTimeout(() => {
        logger.error('Shutdown timed out. Forcing exit.');
        process.exit(1);
    }, 30000);
};

// Signal listeners
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
    logger.error('🔥 UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('🔥 UNHANDLED REJECTION at:', { promise, reason });
});

// Start the service
syncService.start().catch((err: Error) => {
    logger.error('❌ Failed to start service:', err);
    process.exit(1);
});
