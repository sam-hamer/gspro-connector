import { LogLevel } from '../../../../utils/logger'

export interface ElectronAPI {
  // Logger functions
  logger: {
    getLoggerSettings: () => Promise<{ isEnabled: boolean; logLevel: LogLevel }>
    setLoggerEnabled: (enabled: boolean) => Promise<void>
    setLoggerLevel: (level: LogLevel) => Promise<void>
    debug: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }

  // Dark mode
  darkMode: {
    toggle: () => Promise<boolean>
    system: () => Promise<void>
    isDark: () => Promise<boolean>
  }

  // Bluetooth functions
  bluetoothPairingRequest: (callback: () => void) => () => void
  bluetoothPairingResponse: (response: boolean) => void
  cancelBluetoothRequest: () => void
  onBluetoothDevicesFound: (
    callback: (deviceList: Array<{ deviceId: string; deviceName?: string }>) => void
  ) => () => void
  selectBluetoothDevice: (deviceId: string) => void

  // TCP functions
  tcpConnect: (host: string, port: number) => Promise<void>
  tcpDisconnect: () => Promise<void>
  tcpSend: (data: unknown) => Promise<void>
  onTcpData: (callback: (data: unknown) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
