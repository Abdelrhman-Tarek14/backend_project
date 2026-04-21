import cron from 'node-cron';
import { CONFIG } from './core/config/env.js';
import { Logger } from './core/logger.js';
import { GoogleSheetsService } from './infrastructure/google/sheets.service.js';
import { BackendClient } from './infrastructure/http/backend.client.js';
import { StateManager } from './application/state.manager.js';
import { PollerService } from './application/poller.service.js';

const logger = new Logger('Main');

logger.info('Sheet Poller Service starting...', { environment: CONFIG.NODE_ENV });

// Initialize dependencies
const sheetsService = new GoogleSheetsService();
const backendClient = new BackendClient();
const stateManager = new StateManager();

// Bootstrap application
const poller = new PollerService(sheetsService, backendClient, stateManager);

let isShuttingDown = false;

// Scheduling function
const scheduleJob = () => {
  logger.info(`Scheduling polling job: ${CONFIG.POLLING_INTERVAL_CRON}`);
  
  cron.schedule(CONFIG.POLLING_INTERVAL_CRON, async () => {
    if (isShuttingDown) {
      logger.debug('Skipping schedule: system is shutting down.');
      return;
    }
    await poller.runSync();
  });
};

// Shutdown handler
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  const checkInterval = setInterval(() => {
    if (!poller.isSyncing) {
      clearInterval(checkInterval);
      logger.info('Poller is idle. Exiting now.');
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

// Process Global Error Handling
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

// Start the service
(async () => {
  try {
    // Initial sync
    logger.info('Performing initial sync on startup...');
    await poller.runSync();
    
    // Start cron
    scheduleJob();
  } catch (err: any) {
    logger.error('Failed to start service', err.message);
    process.exit(1);
  }
})();
