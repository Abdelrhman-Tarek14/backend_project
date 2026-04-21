export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LogLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

const Colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

export class Logger {
  private context: string;
  private isProduction: boolean;
  private minLevel: LogLevel;

  constructor(context: string) {
    this.context = context;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level < this.minLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevelNames[level];

    // Combine args into metadata object for JSON logging
    let metadata: any = undefined;
    if (args.length > 0) {
      metadata = args.length === 1 ? args[0] : { args };
    }

    if (this.isProduction) {
      // Structured Logging (JSON)
      console.log(JSON.stringify({
        timestamp,
        level: levelName,
        context: this.context,
        message,
        ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : { data: metadata }),
      }));
    } else {
      // Pretty Logging (Colors)
      const color = this.getLevelColor(level);
      const metaStr = metadata ? ` ${Colors.dim}${JSON.stringify(metadata)}${Colors.reset}` : '';
      console.log(
        `${Colors.dim}[${timestamp}]${Colors.reset} ${color}${levelName.padEnd(5)}${Colors.reset} ${Colors.blue}[${this.context}]${Colors.reset} ${message}${metaStr}`
      );
    }
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return Colors.dim;
      case LogLevel.INFO: return Colors.green;
      case LogLevel.WARN: return Colors.yellow;
      case LogLevel.ERROR: return Colors.red;
      default: return Colors.reset;
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }
}
