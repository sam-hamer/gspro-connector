import { ByteConversionUtils } from './byteConversionUtils'
import { WebApiClient } from './webApi'
import Encryption from './encryption'
import { BluetoothDevice } from 'electron'
import Logger from './logger'

declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        filters: Array<{ namePrefix: string }>
        optionalServices: string[]
      }): Promise<ExtendedBluetoothDevice>
    }
  }
}

interface ExtendedBluetoothDevice extends BluetoothDevice {
  name?: string
  gatt?: {
    connected: boolean
    connect(): Promise<BluetoothRemoteGATTService>
    disconnect(): Promise<void>
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
  }
}

interface BluetoothRemoteGATTService {
  getCharacteristic: (uuid: string) => Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue: (value: Uint8Array) => Promise<void>
  writeValueWithoutResponse: (value: Uint8Array) => Promise<void>
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener: (
    type: string,
    listener: (event: CharacteristicValueChangedEvent) => void
  ) => void
}

type CharacteristicValueChangedEvent = {
  target: {
    value: {
      buffer: ArrayBuffer
    }
    uuid: string
  }
}

const SERVICE_UUID = 'daf9b2a4-e4db-4be4-816d-298a050f25cd'
const AUTH_REQUEST_CHARACTERISTIC_UUID = 'b1e9ce5b-48c8-4a28-89dd-12ffd779f5e1' // Write Only

const COMMAND_CHARACTERISTIC_UUID = '1ea0fa51-1649-4603-9c5f-59c940323471' // Write Only

const CONFIGURE_CHARACTERISTIC_UUID = 'df5990cf-47fb-4115-8fdd-40061d40af84' // Write Only
const EVENTS_CHARACTERISTIC_UUID = '02e525fd-7960-4ef0-bfb7-de0f514518ff'

const HEARTBEAT_CHARACTERISTIC_UUID = 'ef6a028e-f78b-47a4-b56c-dda6dae85cbf'

const MEASUREMENT_CHARACTERISTIC_UUID = '76830bce-b9a7-4f69-aeaa-fd5b9f6b0965'
const WRITE_RESPONSE_CHARACTERISTIC_UUID = 'cfbbcb0d-7121-4bc2-bf54-8284166d61f0'

const uuidMap = new Map()

uuidMap.set(SERVICE_UUID, 'SERVICE_UUID')
uuidMap.set(AUTH_REQUEST_CHARACTERISTIC_UUID, 'AUTH_REQUEST_CHARACTERISTIC_UUID')
uuidMap.set(COMMAND_CHARACTERISTIC_UUID, 'COMMAND_CHARACTERISTIC_UUID')
uuidMap.set(CONFIGURE_CHARACTERISTIC_UUID, 'CONFIGURE_CHARACTERISTIC_UUID')
uuidMap.set(EVENTS_CHARACTERISTIC_UUID, 'EVENTS_CHARACTERISTIC_UUID')
uuidMap.set(HEARTBEAT_CHARACTERISTIC_UUID, 'HEARTBEAT_CHARACTERISTIC_UUID')
uuidMap.set(MEASUREMENT_CHARACTERISTIC_UUID, 'MEASUREMENT_CHARACTERISTIC_UUID')
uuidMap.set(WRITE_RESPONSE_CHARACTERISTIC_UUID, 'WRITE_RESPONSE_CHARACTERISTIC_UUID')

class BluetoothManager {
  private primaryService: BluetoothRemoteGATTService | null
  private bluetoothDevice: ExtendedBluetoothDevice | null
  private encryption: Encryption
  private userToken: string
  private heartbeatTimer: number | null
  private lastHeartbeatReceived: number
  private webApiClient: WebApiClient | null = null
  private batteryLevel: number
  private isDeviceSetup: boolean

  constructor() {
    this.primaryService = null
    this.bluetoothDevice = null
    this.encryption = new Encryption()
    this.userToken = ''
    this.heartbeatTimer = null
    this.lastHeartbeatReceived = 0
    this.batteryLevel = 0
    this.isDeviceSetup = false
  }

  async initializeWebApiClient(): Promise<void> {
    this.webApiClient = await WebApiClient.create()
  }

  async discoverDevicesAsync(): Promise<void> {
    try {
      Logger.debug('discoverDevicesAsync :: Starting device discovery')
      Logger.debug('Requesting Bluetooth device with filters...')
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'MLM2-' }, { namePrefix: 'BlueZ ' }, { namePrefix: 'MLM2_BT_' }],
        optionalServices: [SERVICE_UUID]
      })

      Logger.debug('Device selected:', device.name)

      Logger.debug('Attempting to connect to device...')
      await this.connectToDeviceAsync(device)

      if (this.bluetoothDevice) {
        Logger.debug('Device successfully connected and initialized')
        Logger.debug('Device discovery initiated')
        return
      } else {
        Logger.debug('Device connection failed - bluetoothDevice is null')
      }
    } catch (error) {
      Logger.error('Error in discoverDevicesAsync:', error)
      throw error // Re-throw to ensure error propagates
    }
  }

  async armDeviceAsync(): Promise<void> {
    Logger.debug('armDeviceAsync :: start')

    if (!this.bluetoothDevice) {
      Logger.debug('Device not connected')
      return
    }

    const armData = new Uint8Array([1, 13, 0, 1, 0, 0, 0])
    await this.writeCommand(armData)

    Logger.debug('Arm command sent')
  }

  async disarmDeviceAsync(): Promise<void> {
    Logger.debug('disarmDeviceAsync :: start')

    if (!this.bluetoothDevice) {
      Logger.debug('Device not connected')
      return
    }

    const disarmData = new Uint8Array([1, 13, 0, 0, 0, 0, 0])
    await this.writeCommand(disarmData)

    Logger.debug('Disarm command sent')
  }

  async disconnectDeviceAsync(): Promise<void> {
    Logger.debug('disconnectDeviceAsync :: start')

    try {
      // Stop the heartbeat timer
      if (this.heartbeatTimer) {
        Logger.debug('Clearing heartbeat timer')
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }

      if (!this.bluetoothDevice) {
        Logger.debug('Device not connected')
        return
      }

      // Send disconnect command
      const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0])
      await this.writeCommand(data)

      // Disconnect GATT
      if (this.bluetoothDevice.gatt?.connected) {
        await this.bluetoothDevice.gatt.disconnect()
      }

      // Reset state
      this.bluetoothDevice = null
      this.primaryService = null
      this.userToken = ''
      this.lastHeartbeatReceived = 0

      Logger.debug('Device disconnected and state cleaned up')
    } catch (error) {
      Logger.error('Error during disconnect:', error)
      // Still try to clean up state even if there was an error
      this.bluetoothDevice = null
      this.primaryService = null
      this.heartbeatTimer = null
      this.userToken = ''
      this.lastHeartbeatReceived = 0
    }
  }

  async connectToDeviceAsync(device: ExtendedBluetoothDevice): Promise<void> {
    try {
      if (!device.gatt) {
        throw new Error('Bluetooth GATT not available')
      }
      await device.gatt.connect()
      Logger.debug('Device Connected')

      this.primaryService = await device.gatt.getPrimaryService(SERVICE_UUID)
      Logger.debug('Primary Service Obtained')

      this.bluetoothDevice = device
      await this.initializeWebApiClient()
      await this.setupBluetoothDevice()
      Logger.debug('Bluetooth Device Setup Completed')
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Error connecting to device: ${error.message}`)
      } else {
        Logger.error(`Error connecting to device: ${String(error)}`)
      }
    }
  }

  async setupBluetoothDevice(): Promise<void> {
    this.isDeviceSetup = await this.subscribeToCharacteristicsAsync()

    const authStatus = await this.sendDeviceAuthRequest()
    if (authStatus) {
      Logger.debug('Device auth request sent successfully')
      this.startHeartbeat()
    } else {
      Logger.debug('Error sending device auth request')
    }
  }

  async subscribeToCharacteristicsAsync(): Promise<boolean> {
    try {
      if (!this.primaryService) {
        throw new Error('Primary service not available')
      }

      const eventsCharacteristic = await this.primaryService.getCharacteristic(
        EVENTS_CHARACTERISTIC_UUID
      )
      if (eventsCharacteristic == null) return false
      eventsCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleCharacteristicValueChanged.bind(this)
      )
      await eventsCharacteristic.startNotifications()

      //   const heartbeatCharacteristic =
      //     await this.primaryService.getCharacteristic(
      //       HEARTBEAT_CHARACTERISTIC_UUID,
      //     );
      //   Logger.debug("got heartbeat characteristic");
      //   if (heartbeatCharacteristic == null) return false;
      //   heartbeatCharacteristic.addEventListener(
      //     "characteristicvaluechanged",
      //     this.handleCharacteristicValueChanged.bind(this),
      //   );
      //   await heartbeatCharacteristic.startNotifications();
      //   Logger.debug("Subscribed to heartbeat characteristic");

      const writeResponseCharacteristic = await this.primaryService.getCharacteristic(
        WRITE_RESPONSE_CHARACTERISTIC_UUID
      )
      if (writeResponseCharacteristic == null) return false
      writeResponseCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleCharacteristicValueChanged.bind(this)
      )
      await writeResponseCharacteristic.startNotifications()

      const measurementCharacteristic = await this.primaryService.getCharacteristic(
        MEASUREMENT_CHARACTERISTIC_UUID
      )
      if (measurementCharacteristic == null) return false
      measurementCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleCharacteristicValueChanged.bind(this)
      )
      await measurementCharacteristic.startNotifications()
      Logger.debug('Subscribed to measurement characteristic')

      Logger.debug('Successfully Subscribed to all notifications')
      return true
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Error subscribing to characteristics:', error.message)
      } else {
        Logger.error('Error subscribing to characteristics:', String(error))
      }
      return false
    }
  }

  async handleCharacteristicValueChanged(event: CharacteristicValueChangedEvent): Promise<void> {
    try {
      const value = new Uint8Array(event.target.value.buffer)

      const senderUuid = event.target.uuid
      Logger.debug('notification received for: ', uuidMap.get(senderUuid), event)

      if (senderUuid === WRITE_RESPONSE_CHARACTERISTIC_UUID) {
        if (value.length >= 2) {
          const byte2 = value[0] // 02 Means Send initial parameters

          const byte3 = value[1] // 00 is needed here saying it is accepting a response

          if (value.length > 2) {
            const byteArray = value.slice(2)

            if (byte2 === 2) {
              Logger.debug('auth requested: running InitialParams')

              if (byte3 !== 0 || value.length < 4) {
                Logger.debug('auth failed, returning')
                if (byte3 === 1) {
                  Logger.debug('token expired')
                }
                return
              }
              const byteArr3 = byteArray.slice(0, 4)
              // Retrieve the USER ID from the device's response
              const byteArrayToInt = ByteConversionUtils.byteArrayToInt(Array.from(byteArr3), true)

              if (!this.webApiClient) {
                await this.initializeWebApiClient()
              }
              // Call the WebApiClient to get the authorization token for the device using the USER ID
              const response = await this.webApiClient?.sendRequestAsync(byteArrayToInt.toString())

              if (response && response.success && response.user.token) {
                const initialParameters = this.getInitialParameters(response.user.token)
                Logger.debug('sending config 1')
                await this.writeConfig(initialParameters)
                // Send the configuration twice with a delay

                setTimeout(async () => {
                  await this.writeConfig(initialParameters)
                }, 200)
                setTimeout(async () => {
                  Logger.debug('sending config 2')
                }, 500)
              }
              return
            }
          }
        }
      } else if (senderUuid === EVENTS_CHARACTERISTIC_UUID && this.isDeviceSetup) {
        Logger.debug('events characteristic value changed:', value)
        const decrypted = await this.encryption.decrypt(value)
        if (!decrypted) return

        switch (decrypted[0]) {
          case 0:
            Logger.debug('Connected, shot happened')
            break
          case 1:
            Logger.debug('Connected, processing shot')
            break
          case 2:
            Logger.debug('Connected, ready')
            break
          case 3:
            this.batteryLevel = decrypted[1]
            Logger.debug('Connected, battery level:', this.batteryLevel)
            break
          case 5:
            if (decrypted[1] === 0) {
              Logger.debug('Connected, alarm reset')
            } else if (decrypted[1] === 1) {
              Logger.debug('Connected, disarmed')
            }
            break
          default:
            Logger.debug('unknown event type')
            break
        }
      } else if (senderUuid === MEASUREMENT_CHARACTERISTIC_UUID && this.isDeviceSetup) {
        Logger.debug('Measurement characteristic value changed:', value)
        const decrypted = await this.encryption.decrypt(value)
        if (!decrypted) return

        // Convert the decrypted bytes to a hex string
        const hexString = ByteConversionUtils.byteArrayToHexString(Array.from(decrypted))
        Logger.debug('Decrypted hex string:', hexString)

        // Parse the shot data
        const shotData = ByteConversionUtils.parseShotData(hexString)
        if (shotData) {
          Logger.debug('Parsed shot data:', shotData)
          // Send shot data to GSPro
          try {
            await window.electronAPI.tcpSend(shotData)
            Logger.debug('Shot data sent to GSPro successfully')
          } catch (error) {
            Logger.error('Error sending shot data to GSPro:', error)
          }
        } else {
          Logger.debug('Failed to parse shot data')
        }
      }
    } catch (error) {
      Logger.error('Error handling characteristic value change:', error)
    }
  }

  getInitialParameters(tokenInput: string): Uint8Array {
    this.userToken = tokenInput

    // Generate required byte arrays
    const airPressureBytes = ByteConversionUtils.getAirPressureBytes(0.0)
    const temperatureBytes = ByteConversionUtils.getTemperatureBytes(15.0)

    // Ensure userToken is treated as BigInt
    const userTokenBigInt = BigInt(this.userToken)

    // Convert BigInt to Uint8Array using DataView
    const longToUintToByteArray = new Uint8Array(8)
    const view = new DataView(longToUintToByteArray.buffer)
    view.setBigUint64(0, userTokenBigInt, true) // true for little-endian

    // Concatenate all byte arrays
    const concatenatedBytes = new Uint8Array([
      1,
      2,
      0,
      0,
      ...airPressureBytes,
      ...temperatureBytes,
      ...longToUintToByteArray,
      0,
      0
    ])

    return concatenatedBytes
  }

  async sendDeviceAuthRequest(): Promise<boolean> {
    try {
      // Convert integer to byte array
      const intToByteArray = ByteConversionUtils.intToByteArray(1, true)

      // Get encryption type bytes
      const encryptionTypeBytes = Encryption.getEncryptionTypeBytes()

      // Get encryption key bytes
      const keyBytes = this.encryption.getKeyBytes()

      // Create the byte array to send
      const bArr = new Uint8Array(
        intToByteArray.length + encryptionTypeBytes.length + keyBytes.length
      )
      bArr.set(intToByteArray, 0)
      bArr.set(encryptionTypeBytes, intToByteArray.length)
      bArr.set(keyBytes, intToByteArray.length + encryptionTypeBytes.length)

      // Call the writeValue function to send the initial connection request with the encryption key
      const status = await this.writeValue(SERVICE_UUID, AUTH_REQUEST_CHARACTERISTIC_UUID, bArr)
      Logger.debug('sendDeviceAuthRequest :: writeValue status:', status)

      return status
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Error sending device auth request:', error.message)
      } else {
        Logger.error('Error sending device auth request:', String(error))
      }
      return false
    }
  }

  async writeValue(
    serviceUuid: string,
    characteristicUuid: string,
    value: Uint8Array
  ): Promise<boolean> {
    try {
      if (!this.primaryService) {
        throw new Error('Primary service not available')
      }
      const characteristic = await this.primaryService.getCharacteristic(characteristicUuid)
      await characteristic.writeValue(value)
      Logger.debug('Value written to characteristic: ', uuidMap.get(characteristicUuid))
      return true
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Error writing value to characteristic:', error.message)
      } else {
        Logger.error('Error writing value to characteristic:', String(error))
      }
      return false
    }
  }

  async writeCommand(data: Uint8Array): Promise<boolean> {
    try {
      Logger.debug('writeCommand :: data:', data)
      // Encrypt the data using the Encryption instance
      const encryptedData = await this.encryption.encrypt(data)

      // Write the encrypted data to the COMMAND_CHARACTERISTIC_UUID characteristic
      const status = await this.writeValue(SERVICE_UUID, COMMAND_CHARACTERISTIC_UUID, encryptedData)

      return status
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Error writing command:', error.message)
      } else {
        Logger.error('Error writing command:', String(error))
      }
      return false
    }
  }

  async writeConfig(data: Uint8Array): Promise<boolean> {
    try {
      Logger.debug('writeConfig :: data:', data)
      // Encrypt the data using the Encryption instance
      const encryptedData = await this.encryption.encrypt(data)

      // Write the encrypted data to the CONFIGURE_CHARACTERISTIC_UUID characteristic
      const status = await this.writeValue(
        SERVICE_UUID,
        CONFIGURE_CHARACTERISTIC_UUID,
        encryptedData
      )

      return status
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Error writing config:', error.message)
      } else {
        Logger.error('Error writing config:', String(error))
      }
      return false
    }
  }

  async writeCharacteristic(
    serviceUuid: string,
    characteristicUuid: string,
    data: Uint8Array
  ): Promise<boolean> {
    try {
      if (!this.primaryService) {
        throw new Error('Primary service not available')
      }
      //   Logger.debug('writeCharacteristic :: characteristicUUID:', uuidMap.get(characteristicUuid))
      const characteristic = await this.primaryService.getCharacteristic(characteristicUuid)
      await characteristic.writeValueWithoutResponse(data)

      //   Logger.debug('writeCharacteristic :: characteristic.writeValueWithoutResponse')

      return true
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Error writing value to characteristic ${characteristicUuid}:`, error.message)
      } else {
        Logger.error(`Error writing value to characteristic ${characteristicUuid}:`, String(error))
      }
      return false
    }
  }

  startHeartbeat(): void {
    Logger.debug('startHeartbeat :: start')

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    // this.heartbeatTimer = setInterval(() => this.sendHeartbeatSignal(), 2000);
    this.lastHeartbeatReceived = Math.floor(Date.now() / 1000) + 20

    setTimeout(() => {
      // if (this.heartbeatTimer) {
      //   clearInterval(this.heartbeatTimer);
      // }
      this.heartbeatTimer = setInterval(() => this.sendHeartbeatSignal(), 2000) as unknown as number
    }, 5000)
  }

  async sendHeartbeatSignal(): Promise<void> {
    if (!this.bluetoothDevice) return

    const currentTimeInSeconds = Math.floor(Date.now() / 1000)
    if (this.lastHeartbeatReceived < currentTimeInSeconds - 120) {
      Logger.debug('Heartbeat not received for 120 seconds, resubscribing...')
      this.lastHeartbeatReceived = currentTimeInSeconds + 120
      await this.subscribeToCharacteristicsAsync()
    }

    const heartbeatData = new Uint8Array([0x01])
    await this.writeCharacteristic(SERVICE_UUID, HEARTBEAT_CHARACTERISTIC_UUID, heartbeatData)

    Logger.debug('Heartbeat signal sent.')
  }
}

const bluetoothManager = new BluetoothManager()

export { bluetoothManager }
