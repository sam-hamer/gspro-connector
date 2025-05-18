import { ByteConversionUtils } from './byteConversionUtils'
import '@jest/globals'

describe('ByteConversionUtils', () => {
  describe('parseShotData', () => {
    it('should correctly parse shot data from hex string', () => {
      const hexString = '44004F00E2FF0A01C8FFFC0705000A0000000000'
      const result = ByteConversionUtils.parseShotData(hexString)

      // Expected values based on the hex string:
      // 00 44 -> 68 (Club Head Speed)
      // 00 4F -> 79 (Ball Speed)
      // FF E2 -> -30 (HLA)
      // 01 0A -> 266 (VLA)
      // FF C8 -> -56 (Spin Axis)
      // 07 FC -> 2044 (Total Spin)

      expect(result).not.toBeNull()
      if (result) {
        // Check basic structure
        expect(result.DeviceID).toBe('GSPro LM 1.1')
        expect(result.Units).toBe('Yards')
        expect(result.ShotNumber).toBe(13)
        expect(result.APIversion).toBe('1')

        // Check BallData
        expect(result.BallData.Speed).toBe(17.68) // 79/10 * 2.2375
        expect(result.BallData.HLA).toBe(-3.0) // -30/10
        expect(result.BallData.VLA).toBe(26.6) // 266/10
        expect(result.BallData.SpinAxis).toBe(-5.6) // -56/10
        expect(result.BallData.TotalSpin).toBe(2044) // 2044

        // Check ClubData
        expect(result.ClubData.Speed).toBe(15.21) // 68/10 * 2.2375

        // Check ShotDataOptions
        expect(result.ShotDataOptions.ContainsBallData).toBe(true)
        expect(result.ShotDataOptions.ContainsClubData).toBe(true)
        expect(result.ShotDataOptions.LaunchMonitorIsReady).toBe(true)
        expect(result.ShotDataOptions.IsHeartBeat).toBe(false)
      }
    })

    it('should return null for invalid hex string', () => {
      const invalidHexString = 'invalid'
      const result = ByteConversionUtils.parseShotData(invalidHexString)
      expect(result).toBeNull()
    })

    it('should return null for hex string with insufficient length', () => {
      const shortHexString = '44004F00E2FF' // Too short
      const result = ByteConversionUtils.parseShotData(shortHexString)
      expect(result).toBeNull()
    })
  })
})
