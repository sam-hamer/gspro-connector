import { ElectronAPI } from '@electron-toolkit/preload'

export interface IElectronAPI {
  bluetoothPairingRequest: (callback: () => void) => void
  bluetoothPairingResponse: (response: boolean) => void
  cancelBluetoothRequest: () => void
  onBluetoothDevicesFound: (
    callback: (deviceList: Array<{ deviceId: string; deviceName?: string }>) => void
  ) => void
  selectBluetoothDevice: (deviceId: string) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronAPI: IElectronAPI
  }
}
