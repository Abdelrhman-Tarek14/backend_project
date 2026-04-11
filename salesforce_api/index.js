const syncService = require('./src/services/sync-service');

console.log('====================================================');
console.log('   Salesforce API Integration Service Starting...   ');
console.log('====================================================');

process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Start the service
syncService.start().catch(err => {
    console.error('❌ Failed to start service:', err);
    process.exit(1);
});
