/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    bluetoothPairingRequest: (callback: () => void) => void
    bluetoothPairingResponse: (response: boolean) => void
    cancelBluetoothRequest: () => void
    onBluetoothDevicesFound: (
      callback: (deviceList: { deviceId: string; deviceName?: string }[]) => void
    ) => void
    selectBluetoothDevice: (deviceId: string) => void
  }
}
