import { GoogleSheetsService } from '../infrastructure/google/sheets.service.js';
import { BackendClient } from '../infrastructure/http/backend.client.js';
import { StateManager } from './state.manager.js';
import { BackendCasePayload } from '../interfaces/case.interface.js';
import { toCairoISO } from '../utils/date.utils.js';
import { Logger } from '../core/logger.js';

export class PollerService {
  private isSyncing = false;
  private logger = new Logger('PollerService');

  constructor(
    private sheetsService: GoogleSheetsService,
    private backendClient: BackendClient,
    private stateManager: StateManager
  ) {}

  async runSync() {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress. Skipping this cycle.');
      return;
    }

    this.isSyncing = true;
    this.logger.info('Starting sync cycle');

    try {
      const cursor = this.stateManager.getCursor();
      const totalRows = await this.sheetsService.getTotalRows();

      this.logger.info(`Status: Cursor at ${cursor}, Total rows at ${totalRows}`);

      if (totalRows <= cursor) {
        if (totalRows < cursor) {
          this.logger.warn('Sheet seems to have been reset. Resetting cursor to 1.');
          this.stateManager.saveCursor(1);
        } else {
          this.logger.debug('No new rows to process.');
        }
        return;
      }

      // Fetch window
      const startRow = cursor + 1;
      const rawRows = await this.sheetsService.getRows(startRow, totalRows);

      if (rawRows.length === 0) {
        this.logger.debug('Fetched range is empty.');
        this.stateManager.saveCursor(totalRows);
        return;
      }

      const rowsToProcess: BackendCasePayload[] = [];
      const rowIndicesToMarkDone: number[] = [];
      const rowIndicesToMarkError: number[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const actualRowIndex = startRow + i;

        // B:1 is SyncStatus. Skip if 'done'
        if (row[1] === 'done') continue;

        try {
          const payload = this.mapAndValidateRow(row, actualRowIndex);
          if (payload) {
            rowsToProcess.push(payload);
            rowIndicesToMarkDone.push(actualRowIndex);
          } else {
            rowIndicesToMarkError.push(actualRowIndex);
          }
        } catch (err: any) {
          this.logger.error(`Error mapping row ${actualRowIndex}`, err.message);
          rowIndicesToMarkError.push(actualRowIndex);
        }
      }

      // Handle Errors
      if (rowIndicesToMarkError.length > 0) {
        await this.sheetsService.updateSyncStatus(rowIndicesToMarkError, 'error');
      }

      // Sync to Backend
      if (rowsToProcess.length > 0) {
        this.logger.info(`Found ${rowsToProcess.length} valid rows. Syncing...`);
        const success = await this.backendClient.sendPayload(rowsToProcess);

        if (success) {
          await this.sheetsService.updateSyncStatus(rowIndicesToMarkDone, 'done');
          this.stateManager.saveCursor(totalRows);
          this.logger.info('Sync cycle completed successfully');
        } else {
          this.logger.error('Backend sync failed. Cursor remains unchanged.');
        }
      } else {
        this.logger.debug('No valid pending rows found in this window.');
        this.stateManager.saveCursor(totalRows);
      }
    } catch (error: any) {
      this.logger.error('Critical failure in sync cycle', error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  private mapAndValidateRow(row: string[], index: number): BackendCasePayload | null {
    // Precise Mapping based on Sheet Columns A-M (0-12):
    // A:0 (logAction), B:1 (syncStatus), C:2 (formSubmitTime), D:3 (caseOwner), 
    // E:4 (caseNumber), F:5 (formType), G:6 (Ignore - Break), 
    // H:7 (items), I:8 (choices), J:9 (description), K:10 (images), L:11 (tmpAreas), M:12 (eta)

    const rawTimestamp = (row[2] || '').trim();
    const rawOwner = (row[3] || '').trim();
    const rawCaseNumber = (row[4] || '').trim();
    const rawFormType = (row[5] || '').trim();

    if (!rawTimestamp || !rawOwner || !rawCaseNumber) {
      this.logger.warn(`Row ${index} is missing mandatory CaseNumber, Owner, or Timestamp. Skipping.`);
      return null;
    }

    return {
      caseNumber: rawCaseNumber,
      caseOwner: rawOwner,
      formType: rawFormType || 'Unknown',
      formSubmitTime: toCairoISO(rawTimestamp),
      breakMins: this.parseSafeInt(row[6]),
      items: this.parseSafeInt(row[7]),
      choices: this.parseSafeInt(row[8]),
      description: this.parseSafeInt(row[9]),
      images: this.parseSafeInt(row[10]),
      tmpAreas: this.parseSafeInt(row[11]),
      eta: row[12] && row[12].trim() !== '' ? this.parseSafeInt(row[12]) : null,
    };
  }

  private parseSafeInt(val: any): number {
    if (val === undefined || val === null || String(val).trim() === '') return 0;
    const parsed = Number(val);
    return isNaN(parsed) ? 0 : Math.floor(parsed);
  }
}
