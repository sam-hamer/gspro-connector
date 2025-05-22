import Logger from './logger'
class Encryption {
  private _ivParameter: Uint8Array
  private _encryptionKey: Uint8Array

  constructor() {
    this._ivParameter = new Uint8Array([
      109, 46, 82, 19, 33, 50, 4, 69, 111, 44, 121, 72, 16, 101, 109, 66
    ])
    this._encryptionKey = new Uint8Array([
      26, 24, 1, 38, 249, 154, 60, 63, 149, 185, 205, 150, 126, 160, 38, 61, 89, 199, 68, 140, 255,
      21, 250, 131, 55, 165, 121, 250, 49, 121, 233, 21
    ])
  }

  static getEncryptionTypeBytes(): Uint8Array {
    return new Uint8Array([0, 1])
  }

  getKeyBytes(): Uint8Array {
    return this._encryptionKey
  }

  async encrypt(input: Uint8Array): Promise<Uint8Array> {
    try {
      if (!input) {
        Logger.error('Encrypt received null input')
        return new Uint8Array([])
      }

      const key = await crypto.subtle.importKey(
        'raw',
        this._encryptionKey,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
      )

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: this._ivParameter },
        key,
        input
      )

      return new Uint8Array(encrypted)
    } catch (error) {
      Logger.error(
        `Error encrypting data: ${error instanceof Error ? error.message : String(error)}`
      )
      return new Uint8Array([])
    }
  }

  async decrypt(input: Uint8Array): Promise<Uint8Array | null> {
    try {
      if (!input) return null

      const key = await crypto.subtle.importKey(
        'raw',
        this._encryptionKey,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: this._ivParameter },
        key,
        input
      )

      return new Uint8Array(decrypted)
    } catch (error) {
      Logger.error(
        `Error decrypting data: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  async decryptKnownKey(input: Uint8Array, encryptionKeyInput: Uint8Array): Promise<Uint8Array> {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        encryptionKeyInput,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: this._ivParameter },
        key,
        input
      )

      return new Uint8Array(decrypted)
    } catch (error) {
      Logger.error(
        `Error decrypting data: ${error instanceof Error ? error.message : String(error)}`
      )
      return new Uint8Array([])
    }
  }

  async encryptKnownKey(input: Uint8Array, encryptionKeyInput: Uint8Array): Promise<Uint8Array> {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        encryptionKeyInput,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
      )

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: this._ivParameter },
        key,
        input
      )

      return new Uint8Array(encrypted)
    } catch (error) {
      Logger.error(
        `Error encrypting data: ${error instanceof Error ? error.message : String(error)}`
      )
      return new Uint8Array([])
    }
  }
}

export default Encryption
