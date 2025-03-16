import { ByteConversionUtils } from './byteConversionUtils'
import Encryption from './encryption'

class WebApiClient {
  private _btEncryption: Encryption
  private _byteConversionUtils: typeof ByteConversionUtils
  private _baseUrl: string
  private _secretValue: string

  constructor() {
    this._btEncryption = new Encryption()
    this._byteConversionUtils = ByteConversionUtils
    this._baseUrl = 'https://mlm.rapsodo.com/api/simulator/user/' // Set your base URL here
    // this._secretEnc =
    //   "19605BE9BD42E0B3AEB20003847376012404EC9D72BB5586391F01BE03F031163242C34CD55C2C3E77D10D9A43A677A6";
    // this._secretByteArr = this._byteConversionUtils.stringToByteArray(
    //   this._secretEnc,
    // );
    //const decryptedSecret = this._btEncryption.decrypt(this._secretByteArr);
    //console.log("decrypted secret:", decryptedSecret);
    // this._secretValue = new TextDecoder("utf-8").decode(
    //   new Uint8Array(decryptedSecret).buffer,
    // );
    this._secretValue = 'd3d4baff-02c7-4c91-8100-2e362936e06e'
  }

  async sendRequestAsync(userId: string): Promise<ApiResponse | null> {
    console.log('Sending request to Web API...')

    try {
      const requestUri = `${this._baseUrl}${userId}`
      console.log('user id:', userId, 'secret:', this._secretValue)
      const response = await fetch(requestUri, {
        headers: {
          Secret: this._secretValue
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('Web API request successful.')
      const content = await response.json()
      console.log('Server Response:', content)

      return {
        success: content.success,
        user: content.user
      }
    } catch (error) {
      console.log(`Error: ${error.message}`)
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
