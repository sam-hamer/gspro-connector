// Utility functions and constants
const WriteType = {
  WithResponse: 2,
  WithoutResponse: 1,
  Signed: 4
}

class WriteTypeProperties {
  writeType: number
  property: number

  constructor(writeType: number, property: number) {
    this.writeType = writeType
    this.property = property
  }

  static getWriteTypeProperties(writeType: number): WriteTypeProperties | null {
    switch (writeType) {
      case WriteType.WithResponse:
        return new WriteTypeProperties(WriteType.WithResponse, 8)
      case WriteType.WithoutResponse:
        return new WriteTypeProperties(WriteType.WithoutResponse, 4)
      case WriteType.Signed:
        return new WriteTypeProperties(WriteType.Signed, 64)
      default:
        console.log('Invalid WriteType')
        return null
    }
  }
}

class ByteConversionUtils {
  static shortToByteArray(s: number, littleEndian: boolean): number[] {
    const byte0 = s & 0xff
    const byte1 = (s >> 8) & 0xff
    return littleEndian ? [byte0, byte1] : [byte1, byte0]
  }

  static arrayByteToInt(byteArray: number[]): number[] {
    if (!byteArray) {
      console.log('arrayByteToInt received null byteArray')
      return []
    }

    return Array.from(byteArray, (byte) => byte & 0xff)
  }

  static getAirPressureBytes(d: number): number[] {
    const d2 = d * 0.0065
    const shortVal = ByteConversionUtils.toShort(
      (Math.pow(1.0 - d2 / (15.0 + d2 + 273.15), 5.257) * 1013.25 * 0.1 - 50.0) * 1000.0
    )
    return this.shortToByteArray(shortVal, true)
  }

  static getTemperatureBytes(d: number): number[] {
    const shortVal = ByteConversionUtils.toShort(d * 100.0)
    return this.shortToByteArray(shortVal, true)
  }

  static longToUintToByteArray(j: number, littleEndian: boolean): number[] {
    const bytes: number[] = []
    for (let i = 0; i < 8; i++) {
      bytes.push((j >> (8 * i)) & 0xff)
    }
    return littleEndian ? bytes : bytes.reverse()
  }

  static intToByteArray(i: number, littleEndian: boolean): number[] {
    const bytes = [i & 0xff, (i >> 8) & 0xff, (i >> 16) & 0xff, (i >> 24) & 0xff]
    return littleEndian ? bytes : bytes.reverse()
  }

  static byteArrayToInt(byteArray: number[], littleEndian: boolean): number {
    if (!byteArray || byteArray.length !== 4) {
      console.log('byteArray must be exactly 4 bytes long')
      return 0
    }

    let result = 0
    if (littleEndian) {
      for (let i = 0; i < 4; i++) {
        result |= (byteArray[i] & 0xff) << (8 * i)
      }
    } else {
      for (let i = 0; i < 4; i++) {
        result |= (byteArray[i] & 0xff) << (8 * (3 - i))
      }
    }

    return result
  }

  static stringToByteArray(hex: string): number[] {
    try {
      if (hex.length % 2 !== 0) {
        throw new Error('Hex string length must be even')
      }

      const bytes: number[] = []
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16))
      }
      return bytes
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log(error.message)
      }
      return []
    }
  }

  static byteArrayToHexString(bytes: number[]): string {
    if (!bytes) {
      return ''
    }

    return bytes
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }

  static hexStringToByteArray(hex: string): number[] {
    if (hex.length % 2 !== 0) {
      console.log('The hexadecimal string must have an even number of characters.')
    }

    const bytes: number[] = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substring(i, 2), 16))
    }
    return bytes
  }

  static intArrayToString(intArray: number[]): string {
    return intArray.join(', ')
  }

  static byteArrayToString(byteArray: number[]): string {
    return byteArray.join(', ')
  }

  // Helper method to convert a value to a 16-bit short
  static toShort(value: number): number {
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)
    view.setInt16(0, value, true) // little endian
    return view.getInt16(0, true)
  }
}

export { WriteType, WriteTypeProperties, ByteConversionUtils }
