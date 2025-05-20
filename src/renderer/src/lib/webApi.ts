import { ByteConversionUtils } from './byteConversionUtils'
import Encryption from './encryption'
import Logger from './logger'
class WebApiClient {
  private _btEncryption: Encryption
  private _byteConversionUtils: typeof ByteConversionUtils
  private _baseUrl: string
  private _secretValue: string | null = null
  private _secretEnc: string
  private _secretByteArr: Uint8Array

  private constructor() {
    this._btEncryption = new Encryption()
    this._byteConversionUtils = ByteConversionUtils
    this._baseUrl = 'https://mlm.rapsodo.com/api/simulator/user/'
    this._secretEnc =
      '19605BE9BD42E0B3AEB20003847376012404EC9D72BB5586391F01BE03F031163242C34CD55C2C3E77D10D9A43A677A6'
    this._secretByteArr = new Uint8Array(
      this._byteConversionUtils.stringToByteArray(this._secretEnc)
    )
  }

  static async create(): Promise<WebApiClient> {
    const client = new WebApiClient()
    await client.initialize()
    return client
  }

  async initialize(): Promise<void> {
    const decryptedSecret = await this._btEncryption.decrypt(this._secretByteArr)
    if (decryptedSecret) {
      this._secretValue = new TextDecoder('utf-8').decode(decryptedSecret.buffer as ArrayBuffer)
    }
  }

  async sendRequestAsync(userId: string): Promise<ApiResponse | null> {
    Logger.info('Sending request to Web API...')

    try {
      const requestUri = `${this._baseUrl}${userId}`
      Logger.debug('user id:', userId, 'secret:', this._secretValue)
      const response = await fetch(requestUri, {
        headers: {
          Secret: this._secretValue ?? ''
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      Logger.info('Web API request successful.')
      const content = await response.json()
      Logger.debug('Server Response:', content)

      return {
        success: content.success,
        user: content.user
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        Logger.error(`Error: ${error.message}`)
      }
      return null
    }
  }
}

class User {
  id: string
  token: string
  expireDate: string

  constructor(id: string, token: string, expireDate: string) {
    this.id = id
    this.token = token
    this.expireDate = expireDate
  }
}

class ApiResponse {
  success: boolean
  user: User

  constructor(success: boolean, user: User) {
    this.success = success
    this.user = user
  }
}

export { WebApiClient, User, ApiResponse }
