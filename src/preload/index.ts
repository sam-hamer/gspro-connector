import { contextBridge, ipcRenderer } from 'electron'
import { LogLevel } from '../utils/types'

// Use IPC to log to main process
const logToMain = (level: LogLevel, ...args: unknown[]): void => {
  ipcRenderer.send('logger:log', level, ...args)
}

// Custom APIs for renderer
const api = {
  // Logger functions
  logger: {
    getLoggerSettings: (): Promise<{ isEnabled: boolean; logLevel: LogLevel }> => {
      return ipcRenderer.invoke('logger:getSettings')
    },
    openLogsLocation: (): Promise<void> => {
      return ipcRenderer.invoke('logger:openLogsLocation')
    },
    setLoggerEnabled: (enabled: boolean): Promise<void> => {
      return ipcRenderer.invoke('logger:setEnabled', enabled)
    },
    setLoggerLevel: (level: LogLevel): Promise<void> => {
      return ipcRenderer.invoke('logger:setLogLevel', level)
    },
    debug: (...args: unknown[]): void => {
      ipcRenderer.send('logger:log', 'DEBUG', ...args)
    },
    info: (...args: unknown[]): void => {
      ipcRenderer.send('logger:log', 'INFO', ...args)
    },
    warn: (...args: unknown[]): void => {
      ipcRenderer.send('logger:log', 'WARN', ...args)
    },
    error: (...args: unknown[]): void => {
      ipcRenderer.send('logger:log', 'ERROR', ...args)
    },
    getLogs: (): Promise<string> => {
      return ipcRenderer.invoke('logger:getLogs')
    }
  },

  // Dark mode
  darkMode: {
    toggle: (): Promise<boolean> => ipcRenderer.invoke('dark-mode:toggle'),
    system: (): Promise<void> => ipcRenderer.invoke('dark-mode:system'),
    isDark: (): Promise<boolean> => ipcRenderer.invoke('dark-mode:isDark')
  },

  // Bluetooth functions
  bluetoothPairingRequest: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('bluetooth-pairing-request', handler)
    return () => ipcRenderer.removeListener('bluetooth-pairing-request', handler)
  },
  bluetoothPairingResponse: (response: boolean): void =>
    ipcRenderer.send('bluetooth-pairing-response', response),
  cancelBluetoothRequest: (): void => ipcRenderer.send('cancel-bluetooth-request'),
  onBluetoothDevicesFound: (
    callback: (deviceList: Array<{ deviceId: string; deviceName?: string }>) => void
  ): (() => void) => {
    const handler = (
      _: unknown,
      deviceList: Array<{ deviceId: string; deviceName?: string }>
    ): void => callback(deviceList)
    ipcRenderer.on('bluetooth-devices-found', handler)
    return () => ipcRenderer.removeListener('bluetooth-devices-found', handler)
  },
  selectBluetoothDevice: (deviceId: string): void =>
    ipcRenderer.send('select-bluetooth-device', deviceId),

  // TCP functions
  tcpConnect: (host: string, port: number): Promise<void> =>
    ipcRenderer.invoke('tcp:connect', host, port),
  tcpDisconnect: (): Promise<void> => ipcRenderer.invoke('tcp:disconnect'),
  tcpSend: (data: unknown): Promise<void> => ipcRenderer.invoke('tcp:send', data),
  onTcpData: (callback: (data: unknown) => void): (() => void) => {
    const handler = (_: unknown, data: unknown): void => callback(data)
    ipcRenderer.on('tcp:data', handler)
    return () => ipcRenderer.removeListener('tcp:data', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    logToMain(LogLevel.ERROR, 'Error exposing electronAPI:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
