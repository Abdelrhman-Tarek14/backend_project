import syncService from './services/sync-service.js';

console.log('====================================================');
console.log('   Salesforce API Integration Service Starting...   ');
console.log('====================================================');

process.on('uncaughtException', (err: Error) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Start the service
syncService.start().catch((err: Error) => {
    console.error('❌ Failed to start service:', err);
    process.exit(1);
});
