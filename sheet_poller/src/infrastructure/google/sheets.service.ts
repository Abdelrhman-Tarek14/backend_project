import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import { GOOGLE_CONFIG } from '../../core/config/env.js';
import { Logger } from '../../core/logger.js';

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private logger = new Logger('GoogleSheetsService');

  constructor() {
    if (!fs.existsSync(GOOGLE_CONFIG.CREDENTIALS_PATH)) {
      throw new Error(`Credentials file not found at ${GOOGLE_CONFIG.CREDENTIALS_PATH}`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: GOOGLE_CONFIG.CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.logger.info('Initialized');
  }

  /**
   * Fetches the number of rows in the sheet by checking Column A.
   */
  async getTotalRows(): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEET_NAME}!A:A`,
      });

      return response.data.values?.length || 0;
    } catch (error: any) {
      this.logger.error('Failed to fetch total rows', error.message);
      throw error;
    }
  }

  /**
   * Fetches a specific range of rows from Column A to M.
   */
  async getRows(start: number, end: number): Promise<string[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        range: `${GOOGLE_CONFIG.SHEET_NAME}!A${start}:M${end}`,
      });

      return (response.data.values as string[][]) || [];
    } catch (error: any) {
      this.logger.error(`Failed to fetch rows ${start}:${end}`, error.message);
      throw error;
    }
  }

  /**
   * Updates the sync status in Column B for multiple rows.
   */
  async updateSyncStatus(rowIndices: number[], status: 'done' | 'error' | 'pending' = 'done'): Promise<void> {
    if (rowIndices.length === 0) return;

    try {
      const data = rowIndices.map((rowIndex) => ({
        range: `${GOOGLE_CONFIG.SHEET_NAME}!B${rowIndex}`,
        values: [[status]],
      }));

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data,
        },
      });

      this.logger.info(`Marked ${rowIndices.length} rows as '${status}'`);
    } catch (error: any) {
      this.logger.error('Failed to update sync status', error.message);
      throw error;
    }
  }
}
