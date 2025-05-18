import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { tcpService } from './tcpService'
import { logger, LogLevel } from '../utils/logger'

let bluetoothPinCallback
let selectBluetoothCallback

// Initialize logger with default settings
logger.setEnabled(true)
logger.setLogLevel(LogLevel.INFO)

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Store the window reference globally
  global.mainWindow = mainWindow

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle window close button click
  mainWindow.on('close', (e) => {
    e.preventDefault()
    app.quit()
  })

  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault()
    selectBluetoothCallback = callback

    logger.info('Available Bluetooth devices:', deviceList)

    // Show the device list to the user and let them select
    mainWindow.webContents.send('bluetooth-devices-found', deviceList)

    // Don't call the callback - keep scanning for devices
    // The callback will be called when the user selects a device or cancels
  })

  // Handle device selection from the renderer
  ipcMain.on('select-bluetooth-device', (_, deviceId) => {
    if (selectBluetoothCallback) {
      selectBluetoothCallback(deviceId)
    }
  })

  ipcMain.on('cancel-bluetooth-request', () => {
    selectBluetoothCallback('')
  })

  // Listen for a message from the renderer to get the response for the Bluetooth pairing.
  ipcMain.on('bluetooth-pairing-response', (_, response) => {
    bluetoothPinCallback(response)
  })

  mainWindow.webContents.session.setBluetoothPairingHandler((details, callback) => {
    bluetoothPinCallback = callback
    // Send a message to the renderer to prompt the user to confirm the pairing.
    mainWindow.webContents.send('bluetooth-pairing-request', details)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('dark-mode:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light'
  } else {
    nativeTheme.themeSource = 'dark'
  }
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system'
})

ipcMain.handle('dark-mode:isDark', () => {
  return nativeTheme.shouldUseDarkColors
})

// TCP IPC handlers
ipcMain.handle('tcp:connect', async (_, host: string, port: number) => {
  return tcpService.connect(host, port)
})

ipcMain.handle('tcp:disconnect', async () => {
  return tcpService.disconnect()
})

ipcMain.handle('tcp:send', async (_, data: unknown) => {
  return tcpService.sendJson(data)
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle the quit event
app.on('before-quit', () => {
  // Force quit the app
  app.exit(0)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
