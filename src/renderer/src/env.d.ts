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
    tcpConnect: (host: string, port: number) => Promise<void>
    tcpDisconnect: () => Promise<void>
    tcpSend: (data: unknown) => Promise<void>
    onTcpData: (callback: (data: unknown) => void) => void
  }
}
