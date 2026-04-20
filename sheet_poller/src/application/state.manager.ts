import * as fs from 'fs';
import * as path from 'path';
import { STATE_CONFIG } from '../core/config/env.js';
import { Logger } from '../core/logger.js';

interface CursorState {
  lastRow: number;
}

export class StateManager {
  private filePath: string;
  private logger = new Logger('StateManager');

  constructor() {
    this.filePath = STATE_CONFIG.CURSOR_FILE_PATH;
    this.ensureDir();
    this.logger.info('Initialized', { filePath: this.filePath });
  }

  private ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  getCursor(): number {
    if (!fs.existsSync(this.filePath)) {
      this.logger.debug('No cursor file found, returning default 1');
      return 1;
    }

    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const state: CursorState = JSON.parse(data);
      return state.lastRow || 1;
    } catch (error: any) {
      this.logger.warn('Failed to read cursor file, resetting to 1', error.message);
      return 1;
    }
  }

  saveCursor(lastRow: number) {
    try {
      const state: CursorState = { lastRow };
      fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
      this.logger.debug(`Cursor saved at row ${lastRow}`);
    } catch (error: any) {
      this.logger.error('Failed to save cursor', error.message);
    }
  }
}
