require('dotenv').config();

const env = {
    AURA_TOKEN: process.env.AURA_TOKEN,
    AURA_CONTEXT: process.env.AURA_CONTEXT,
    COOKIE: process.env.COOKIE,
    X_SFDC_Page_Scope_Id: process.env.X_SFDC_Page_Scope_Id,
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'fallback-secret',
    POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL, 10) || 45000,
    HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 300000,
    ALLOWED_CASE_TYPES_RAW: process.env.ALLOWED_CASE_TYPES || "Menu Typing,Please Correct Errors",
    ALLOWED_CASE_TYPES: (process.env.ALLOWED_CASE_TYPES || "Menu Typing,Please Correct Errors").split(',').map(t => t.trim()),
    STATE_FILE: './data/state.json',
    SALESFORCE_URL: "https://deliveryhero.lightning.force.com/aura",
    REPORT_ID: "00ObO0000040xllUAA"
};

// Simple validation
const missingKeys = Object.entries(env)
    .filter(([key, value]) => !value && key !== 'REPORT_ID') // Allow some defaults
    .map(([key]) => key);

if (missingKeys.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(`⚠️ Warning: Missing environment variables: ${missingKeys.join(', ')}`);
}

module.exports = env;
