import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('darkMode', {
      toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
      system: () => ipcRenderer.invoke('dark-mode:system'),
      isDark: () => ipcRenderer.invoke('dark-mode:isDark')
    })
    contextBridge.exposeInMainWorld('electronAPI', {
      bluetoothPairingRequest: (callback) =>
        ipcRenderer.on('bluetooth-pairing-request', () => callback()),
      bluetoothPairingResponse: (response) =>
        ipcRenderer.send('bluetooth-pairing-response', response),
      cancelBluetoothRequest: () => ipcRenderer.send('cancel-bluetooth-request'),
      onBluetoothDevicesFound: (callback) =>
        ipcRenderer.on('bluetooth-devices-found', (_, deviceList) => callback(deviceList)),
      selectBluetoothDevice: (deviceId) => ipcRenderer.send('select-bluetooth-device', deviceId)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
