import type { ElectronAPI } from '../types/electron'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

class Logger {
  public static debug(...args: unknown[]): void {
    window.electronAPI.logger.debug(...args)
  }

  public static info(...args: unknown[]): void {
    window.electronAPI.logger.info(...args)
  }

  public static warn(...args: unknown[]): void {
    window.electronAPI.logger.warn(...args)
  }

  public static error(...args: unknown[]): void {
    window.electronAPI.logger.error(...args)
  }
}

export default Logger
