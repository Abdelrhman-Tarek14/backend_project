import { z } from 'zod';

export const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    
    AURA_TOKEN: z.string().min(1, 'AURA_TOKEN is required'),
    AURA_CONTEXT: z.string().min(1, 'AURA_CONTEXT is required'),
    COOKIE: z.string().min(1, 'COOKIE is required'),
    X_SFDC_Page_Scope_Id: z.string().min(1, 'X_SFDC_Page_Scope_Id is required'),
    
    BACKEND_URL: z.string().url('BACKEND_URL must be a valid URL'),
    INTERNAL_BACKEND_URL: z.string().url().optional(), // Fallback handled in logic
    SALESFORCE_WEBHOOK_SECRET: z.string().min(1, 'SALESFORCE_WEBHOOK_SECRET is required'),
    
    SYNC_CRON: z.string().default('*/30 * * * * *'),       // Default: every 30 seconds
    HEARTBEAT_CRON: z.string().default('*/5 * * * *'),      // Default: every 5 minutes
    
    ALLOWED_CASE_TYPES: z.string().min(1, 'ALLOWED_CASE_TYPES is required'),
    
    STATE_FILE: z.string().min(1, 'STATE_FILE is required'),
    SALESFORCE_URL: z.string().url('SALESFORCE_URL must be a valid URL'),
    REPORT_ID: z.string().min(1, 'REPORT_ID is required'),
});

export type Config = z.infer<typeof configSchema>;
