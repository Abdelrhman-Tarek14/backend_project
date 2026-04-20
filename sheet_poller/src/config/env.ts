import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(process.cwd(), envPath), quiet: false });

export const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  POLLING_INTERVAL_CRON: process.env.POLLING_INTERVAL_CRON || '*/5 * * * *',

  GOOGLE: {
    CREDENTIALS_PATH: path.resolve(process.cwd(), process.env.GOOGLE_CREDENTIALS_PATH || './data/credentials.json'),
    SPREADSHEET_ID: process.env.SPREADSHEET_ID || '',
    SHEET_NAME: process.env.SHEET_NAME || 'Form Responses 1 Send Auto',
  },

  BACKEND: {
    WEBHOOK_URL: process.env.WEBHOOK_URL || 'http://app:3000/cases/webhook/sheet-form',
    GAS_WEBHOOK_SECRET: process.env.GAS_WEBHOOK_SECRET || '',
  },

  STATE: {
    CURSOR_FILE_PATH: path.resolve(process.cwd(), process.env.CURSOR_FILE_PATH || './data/cursor.json'),
  },
};

const required = [
  'SPREADSHEET_ID',
  'GAS_WEBHOOK_SECRET'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.warn(`[Config] WARNING: Missing required environment variable: ${key}`);
  }
});
