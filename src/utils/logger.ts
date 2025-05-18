export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

class Logger {
  private static instance: Logger
  public isEnabled: boolean = true
  private logLevel: LogLevel = LogLevel.INFO

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  getLogLevel(): LogLevel {
    return this.logLevel
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isEnabled) return false

    const levels = Object.values(LogLevel)
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log('[DEBUG]', ...args)
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('[INFO]', ...args)
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('[WARN]', ...args)
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('[ERROR]', ...args)
    }
  }
}

export const logger = Logger.getInstance()
