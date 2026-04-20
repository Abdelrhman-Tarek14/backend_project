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

logger.info(`Scheduling polling job: ${CONFIG.POLLING_INTERVAL_CRON}`);

// Schedule cron
cron.schedule(CONFIG.POLLING_INTERVAL_CRON, async () => {
  await poller.runSync();
});

// Initial sync on startup
(async () => {
  logger.info('Performing initial sync on startup...');
  await poller.runSync();
})();

// Process Event Handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', String(reason));
});
