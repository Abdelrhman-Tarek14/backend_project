import * as dotenv from 'dotenv';
import * as path from 'path';
import { configSchema } from './schema.js';

const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envPath) });

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const CONFIG = parsed.data;

export const GOOGLE_CONFIG = {
  CREDENTIALS_PATH: path.resolve(process.cwd(), CONFIG.GOOGLE_CREDENTIALS_PATH),
  SPREADSHEET_ID: CONFIG.SPREADSHEET_ID,
  SHEET_NAME: CONFIG.SHEET_NAME,
};

export const BACKEND_CONFIG = {
  WEBHOOK_URL_FORM: CONFIG.WEBHOOK_URL_FORM,
  SHEET_WEBHOOK_SECRET: CONFIG.SHEET_WEBHOOK_SECRET,
};

export const STATE_CONFIG = {
  CURSOR_FILE_PATH: path.resolve(process.cwd(), CONFIG.CURSOR_FILE_PATH),
};
