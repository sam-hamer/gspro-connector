import { ElectronAPI } from '@electron-toolkit/preload'

export interface IElectronAPI {
  bluetoothPairingRequest: (callback: () => void) => void
  bluetoothPairingResponse: (response: boolean) => void
  cancelBluetoothRequest: () => void
  onBluetoothDevicesFound: (
    callback: (deviceList: Array<{ deviceId: string; deviceName?: string }>) => void
  ) => void
  selectBluetoothDevice: (deviceId: string) => void
  tcpConnect: (host: string, port: number) => Promise<void>
  tcpDisconnect: () => Promise<void>
  tcpSend: (data: unknown) => Promise<void>
  onTcpData: (callback: (data: unknown) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronAPI: IElectronAPI
  }
}
