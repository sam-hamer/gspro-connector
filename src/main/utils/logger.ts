import { LogLevel } from '../../utils/types'
import { writeFile, appendFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

class Logger {
  private static instance: Logger
  public isEnabled: boolean = true
  private logLevel: LogLevel = LogLevel.INFO
  private logFilePath: string
  private logFileEnabled: boolean = true
  private dateTimeOptions = {
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    fractionalSecondDigits: 3 as const
  }

  private constructor() {
    app.setAppLogsPath()
    const logsPath = app.getPath('logs')
    this.logFilePath = join(logsPath, 'app.log')
    this.initLogFile().catch((error) => {
      console.error('Failed to initialize log file:', error)
    })
  }

  private async initLogFile(): Promise<void> {
    try {
      const header = `=== Log started at ${new Date().toLocaleString(undefined, this.dateTimeOptions)} ===\n`
      await writeFile(this.logFilePath, header)
    } catch (error) {
      console.error('Failed to initialize log file:', error)
      this.logFileEnabled = false
    }
  }

  private async writeToFile(level: LogLevel, ...args: unknown[]): Promise<void> {
    if (!this.logFileEnabled) return

    try {
      const timestamp = new Date().toLocaleString(undefined, this.dateTimeOptions)
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      const logEntry = `[${timestamp}] [${level}] ${message}\n`

      await appendFile(this.logFilePath, logEntry)
    } catch (error) {
      console.error('Error writing to log file:', error)
      this.logFileEnabled = false
    }
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
      this.writeToFile(LogLevel.DEBUG, ...args)
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('[INFO]', ...args)
      this.writeToFile(LogLevel.INFO, ...args)
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('[WARN]', ...args)
      this.writeToFile(LogLevel.WARN, ...args)
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('[ERROR]', ...args)
      this.writeToFile(LogLevel.ERROR, ...args)
    }
  }
}

export const logger = Logger.getInstance()
