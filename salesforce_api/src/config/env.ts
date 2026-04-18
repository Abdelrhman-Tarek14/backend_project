import * as dotenv from 'dotenv';
dotenv.config({ quiet: true } as any);

interface EnvConfig {
    AURA_TOKEN: string;
    AURA_CONTEXT: string;
    COOKIE: string;
    X_SFDC_Page_Scope_Id: string;
    BACKEND_URL: string;
    SALESFORCE_WEBHOOK_SECRET: string;
    POLL_INTERVAL: number;
    HEARTBEAT_INTERVAL: number;
    ALLOWED_CASE_TYPES_RAW: string;
    ALLOWED_CASE_TYPES: string[];
    STATE_FILE: string;
    SALESFORCE_URL: string;
    REPORT_ID: string;
}

const env: EnvConfig = {
    AURA_TOKEN: process.env.AURA_TOKEN!,
    AURA_CONTEXT: process.env.AURA_CONTEXT!,
    COOKIE: process.env.COOKIE!,
    X_SFDC_Page_Scope_Id: process.env.X_SFDC_Page_Scope_Id!,
    BACKEND_URL: process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_URL!,
    SALESFORCE_WEBHOOK_SECRET: process.env.SALESFORCE_WEBHOOK_SECRET!,
    POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL || '45000', 10),
    HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL || '300000', 10),
    ALLOWED_CASE_TYPES_RAW: process.env.ALLOWED_CASE_TYPES!,
    ALLOWED_CASE_TYPES: (process.env.ALLOWED_CASE_TYPES || '').split(',').map(t => t.trim()),
    STATE_FILE: process.env.STATE_FILE!,
    SALESFORCE_URL: process.env.SALESFORCE_URL!,
    REPORT_ID: process.env.REPORT_ID!
};

// Strict Validation
const requiredKeys: (keyof EnvConfig)[] = [
    'AURA_TOKEN',
    'AURA_CONTEXT',
    'COOKIE',
    'X_SFDC_Page_Scope_Id',
    'BACKEND_URL',
    'SALESFORCE_WEBHOOK_SECRET',
    'REPORT_ID',
    'SALESFORCE_URL',
    'STATE_FILE'
];

const missingKeys = requiredKeys.filter(key => !env[key]);

if (missingKeys.length > 0) {
    const errorMsg = `❌ CRITICAL ERROR: Missing required environment variables: ${missingKeys.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMsg);
    } else {
        console.error(`⚠️ ${errorMsg}`);
    }
}

export default env;
export const {
    AURA_TOKEN,
    AURA_CONTEXT,
    COOKIE,
    X_SFDC_Page_Scope_Id,
    BACKEND_URL,
    SALESFORCE_WEBHOOK_SECRET,
    POLL_INTERVAL,
    HEARTBEAT_INTERVAL,
    ALLOWED_CASE_TYPES_RAW,
    ALLOWED_CASE_TYPES,
    STATE_FILE,
    SALESFORCE_URL,
    REPORT_ID
} = env;
