import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SYNC_CRON: z.string().default('*/30 * * * * *'),       // Default: every 30 seconds

  GOOGLE_CREDENTIALS_PATH: z.string().default('./data/credentials.json'),
  SPREADSHEET_ID: z.string().min(1, 'SPREADSHEET_ID is required'),
  SHEET_NAME: z.string().default('Form Responses 1 Send Auto'),

  WEBHOOK_URL_FORM: z.string().min(1, 'WEBHOOK_URL_FORM is required').default('http://localhost:3000/cases/webhook/sheet-open-cases'),
  SHEET_WEBHOOK_SECRET: z.string().min(1, 'SHEET_WEBHOOK_SECRET is required'),

  CURSOR_FILE_PATH: z.string().default('./data/cursor.json'),
});

export type Config = z.infer<typeof configSchema>;
