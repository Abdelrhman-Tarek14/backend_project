import * as dotenv from 'dotenv';
import * as path from 'path';
import { configSchema } from './schema.js';

// Force load .env.development in non-production environments
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envPath), quiet: false });

const parsedEnv = configSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ CRITICAL ERROR: Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

const env = parsedEnv.data;

export default env;
export const {
    AURA_TOKEN,
    AURA_CONTEXT,
    COOKIE,
    X_SFDC_Page_Scope_Id,
    BACKEND_URL,
    INTERNAL_BACKEND_URL,
    SALESFORCE_WEBHOOK_SECRET,
    SYNC_CRON,
    HEARTBEAT_CRON,
    ALLOWED_CASE_TYPES,
    STATE_FILE,
    SALESFORCE_URL,
    REPORT_ID
} = env;

export const ACTIVE_BACKEND_URL = INTERNAL_BACKEND_URL || BACKEND_URL;
export const PARSED_ALLOWED_CASE_TYPES = ALLOWED_CASE_TYPES.split(',').map(t => t.trim());
