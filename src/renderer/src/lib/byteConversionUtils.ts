import Logger from './logger'
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
        Logger.debug('Invalid WriteType')
        return null
    }
  }
}

interface ShotData {
  DeviceID: string
  Units: string
  ShotNumber: number
  APIversion: string
  BallData: {
    Speed: number
    SpinAxis: number
    TotalSpin: number
    BackSpin: number
    SideSpin: number
    HLA: number
    VLA: number
  }
  ClubData: {
    Speed: number
  }
  ShotDataOptions: {
    ContainsBallData: boolean
    ContainsClubData: boolean
    LaunchMonitorIsReady: boolean
    IsHeartBeat: boolean
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
      Logger.debug('arrayByteToInt received null byteArray')
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
      Logger.debug('byteArray must be exactly 4 bytes long')
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
        Logger.debug(error.message)
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
      Logger.debug('The hexadecimal string must have an even number of characters.')
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

  static parseShotData(hexString: string): ShotData | null {
    try {
      // Convert hex string to byte array
      const bytes = this.stringToByteArray(hexString)

      if (bytes.length < 20) {
        Logger.debug('Invalid shot data length')
        return null
      }

      const multiplier = 2.2375
      const parseInt16 = (offset: number): number => {
        const buffer = new ArrayBuffer(2)
        const view = new DataView(buffer)
        view.setUint8(0, bytes[offset])
        view.setUint8(1, bytes[offset + 1])
        return view.getInt16(0, true) // little endian
      }
      const parseUint16 = (offset: number): number => {
        const buffer = new ArrayBuffer(2)
        const view = new DataView(buffer)
        view.setUint8(0, bytes[offset])
        view.setUint8(1, bytes[offset + 1])
        return view.getUint16(0, true) // little endian
      }

      // Parse values according to the byte table
      const clubHeadSpeed = Math.round((parseInt16(0) / 10) * multiplier * 100) / 100 // 68/10 * 2.2375 = 15.22
      const ballSpeed = Math.round((parseInt16(2) / 10) * multiplier * 100) / 100 // 79/10 * 2.2375 = 17.68
      const hla = parseInt16(4) / 10 // -30/10 = -3.0
      const vla = parseInt16(6) / 10 // 266/10 = 26.6
      const spinAxis = parseInt16(8) / 10 // -56/10 = -5.6
      const totalSpin = parseUint16(10) // 2044

      // Calculate backspin and sidespin from total spin and spin axis
      const spinAxisRad = (spinAxis * Math.PI) / 180
      const backSpin = totalSpin * Math.cos(spinAxisRad)
      const sideSpin = totalSpin * Math.sin(spinAxisRad)

      return {
        DeviceID: 'GSPro LM 1.1',
        Units: 'Yards',
        ShotNumber: 13,
        APIversion: '1',
        BallData: {
          Speed: ballSpeed,
          SpinAxis: spinAxis,
          TotalSpin: totalSpin,
          BackSpin: parseFloat(backSpin.toFixed(1)),
          SideSpin: parseFloat(sideSpin.toFixed(1)),
          HLA: hla,
          VLA: vla
        },
        ClubData: {
          Speed: clubHeadSpeed
        },
        ShotDataOptions: {
          ContainsBallData: true,
          ContainsClubData: true,
          LaunchMonitorIsReady: true,
          IsHeartBeat: false
        }
      }
    } catch (error) {
      Logger.debug('Error parsing shot data:', error)
      return null
    }
  }

  static formatShotData(shotData: ShotData): string {
    return `Device ID: ${shotData.DeviceID}
Units: ${shotData.Units}
Shot Number: ${shotData.ShotNumber}
API Version: ${shotData.APIversion}

Ball Data:
  Speed: ${shotData.BallData.Speed} mph
  Spin Axis: ${shotData.BallData.SpinAxis}°
  Total Spin: ${shotData.BallData.TotalSpin} rpm
  Back Spin: ${shotData.BallData.BackSpin} rpm
  Side Spin: ${shotData.BallData.SideSpin} rpm
  HLA: ${shotData.BallData.HLA}°
  VLA: ${shotData.BallData.VLA}°

Club Data:
  Speed: ${shotData.ClubData.Speed} mph

Shot Data Options:
  Contains Ball Data: ${shotData.ShotDataOptions.ContainsBallData}
  Contains Club Data: ${shotData.ShotDataOptions.ContainsClubData}
  Launch Monitor Ready: ${shotData.ShotDataOptions.LaunchMonitorIsReady}
  Is Heartbeat: ${shotData.ShotDataOptions.IsHeartBeat}`
  }
}

export { WriteType, WriteTypeProperties, ByteConversionUtils }
export type { ShotData }
