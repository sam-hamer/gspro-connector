'use client'

import { useState, useEffect } from 'react'
import { Battery, Power, Link2, Link2Off } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Input } from '../components/ui/input'
import { bluetoothManager } from '../../../utils/bluetooth'
import { Label } from '../components/ui/label'
import { logger } from '../../../utils/logger'

export default function LaunchMonitorConnector(): JSX.Element {
  const [isConnected, setIsConnected] = useState(false)
  const [isArmed, setIsArmed] = useState(false)
  const [batteryPercentage, setBatteryPercentage] = useState(75)
  const [showPairingPrompt, setShowPairingPrompt] = useState(false)
  const [showDeviceList, setShowDeviceList] = useState(false)
  const [devices, setDevices] = useState<Array<{ deviceId: string; deviceName?: string }>>([])
  const [isTcpConnected, setIsTcpConnected] = useState(false)
  const [tcpHost, setTcpHost] = useState('localhost')
  const [tcpPort, setTcpPort] = useState('921')

  useEffect(() => {
    // Register Bluetooth pairing request handler
    logger.info('Setting up Bluetooth pairing request handler')
    const handler = (): void => {
      logger.info('Bluetooth pairing request received')
      setShowPairingPrompt(true)
    }
    window.electronAPI.bluetoothPairingRequest(handler)
  }, [])

  useEffect(() => {
    // Listen for devices found
    window.electronAPI.onBluetoothDevicesFound(
      (deviceList: { deviceId: string; deviceName?: string }[]) => {
        logger.info('Devices found:', deviceList)
        setDevices(deviceList)
        setShowDeviceList(true)
      }
    )
  }, [])

  const handlePairingResponse = (accept: boolean): void => {
    logger.info('Handling pairing response:', accept)
    window.electronAPI.bluetoothPairingResponse(accept)
    setShowPairingPrompt(false)
  }

  const handleDeviceSelect = (deviceId: string): void => {
    window.electronAPI.selectBluetoothDevice(deviceId)
    setShowDeviceList(false)
  }

  const handleCancelDeviceSelection = (): void => {
    window.electronAPI.cancelBluetoothRequest()
    setShowDeviceList(false)
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnected) {
      interval = setInterval(() => {
        setBatteryPercentage((prev) => {
          if (prev <= 5) return prev
          return prev - 1
        })
      }, 30000)
    }
    return (): void => clearInterval(interval)
  }, [isConnected])

  const toggleConnection = async (): Promise<void> => {
    logger.info('toggleConnection :: start')
    if (!isConnected) {
      try {
        logger.info('Attempting to discover devices...')
        await bluetoothManager.discoverDevicesAsync()
        logger.info('Device discovery initiated')
      } catch (error) {
        logger.error('Error during device discovery:', error)
        if (error instanceof Error) {
          logger.error('Error details:', error.message)
          if (error.stack) {
            logger.error('Stack trace:', error.stack)
          }
        }
        return // Don't set isConnected to true if there was an error
      }
    } else {
      try {
        logger.info('Attempting to disconnect...')
        await bluetoothManager.disconnectDeviceAsync()
        logger.info('Device disconnected')
      } catch (error) {
        logger.error('Error disconnecting:', error)
      }
    }
    setIsConnected((prev) => !prev)
    if (isConnected) setIsArmed(false)
  }

  const toggleArmed = (): void => {
    if (!isConnected) return
    if (isArmed) {
      bluetoothManager.disarmDeviceAsync()
    } else {
      bluetoothManager.armDeviceAsync()
    }
    setIsArmed((prev) => !prev)
  }

  useEffect(() => {
    // Set up TCP data listener
    window.electronAPI.onTcpData((data) => {
      logger.info('Received from TCP server:', data)

      // Handle connection status messages
      if (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        'status' in data &&
        data.type === 'connection_status'
      ) {
        switch (data.status) {
          case 'connected':
            setIsTcpConnected(true)
            break
          case 'closed':
          case 'error':
            setIsTcpConnected(false)
            if (data.status === 'error' && 'error' in data) {
              logger.error('TCP connection error:', data.error)
            }
            break
        }
      } else {
        // Handle regular data messages
        logger.info('Received data message:', data)
      }
    })
  }, [])

  const connectToTcpServer = async (): Promise<void> => {
    try {
      const port = parseInt(tcpPort, 10)
      if (isNaN(port) || port < 1 || port > 65535) {
        logger.error('Invalid port number')
        return
      }
      await window.electronAPI.tcpConnect(tcpHost, port)
      setIsTcpConnected(true)
    } catch (error) {
      logger.error('Failed to connect to TCP server:', error)
      setIsTcpConnected(false)
    }
  }

  const disconnectFromTcpServer = async (): Promise<void> => {
    try {
      await window.electronAPI.tcpDisconnect()
      setIsTcpConnected(false)
    } catch (error) {
      logger.error('Failed to disconnect from TCP server:', error)
    }
  }

  const sendTestData = async (): Promise<void> => {
    try {
      const testShot = {
        DeviceID: 'GSPro LM 1.1',
        Units: 'Yards',
        ShotNumber: 13,
        APIversion: '1',
        BallData: {
          Speed: 180,
          SpinAxis: -1.2,
          TotalSpin: 3250.0,
          BackSpin: 2500.0,
          SideSpin: -800.0,
          HLA: 2.3,
          VLA: 8.3,
          CarryDistance: 256.5
        },
        ClubData: {
          Speed: 0.0,
          AngleOfAttack: 0.0,
          FaceToTarget: 0.0,
          Lie: 0.0,
          Loft: 0.0,
          Path: 0.0,
          SpeedAtImpact: 0.0,
          VerticalFaceImpact: 0.0,
          HorizontalFaceImpact: 0.0,
          ClosureRate: 0.0
        },
        ShotDataOptions: {
          ContainsBallData: true,
          ContainsClubData: false,
          LaunchMonitorIsReady: true,
          LaunchMonitorBallDetected: true,
          IsHeartBeat: false
        }
      }
      await window.electronAPI.tcpSend(testShot)
    } catch (error) {
      logger.error('Failed to send data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {showDeviceList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[400px] relative">
            <CardHeader>
              <CardTitle>Select Bluetooth Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {devices.length === 0 ? (
                  <p className="text-muted-foreground">Searching for devices...</p>
                ) : (
                  devices.map((device) => (
                    <Button
                      key={device.deviceId}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleDeviceSelect(device.deviceId)}
                    >
                      {device.deviceName || 'Unknown Device'}
                    </Button>
                  ))
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleCancelDeviceSelection}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPairingPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[300px] relative">
            <CardHeader>
              <CardTitle>Bluetooth Pairing Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Would you like to pair with the Launch Monitor device?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handlePairingResponse(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handlePairingResponse(true)}>Pair</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="container mx-auto max-w-5xl mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Launch Monitor</h1>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-card border-border text-success">
              System Active
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Launch Monitor Card */}
          <Card className="bg-card border-border shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <CardTitle className="text-lg font-semibold text-foreground">
                Launch Monitor Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between"></div>

                {/* Armed Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Power
                      className={`${isArmed ? 'text-success' : 'text-muted-foreground'}`}
                      size={20}
                    />
                    <span className="text-sm text-muted-foreground">Armed Status</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${isArmed ? 'bg-success/10 text-success border-success/20' : 'bg-muted/50 text-muted-foreground border-border'}`}
                  >
                    {isArmed ? 'Armed' : 'Disarmed'}
                  </Badge>
                </div>

                {/* Battery Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Battery
                      className={batteryPercentage > 20 ? 'text-success' : 'text-destructive'}
                      size={20}
                    />
                    <span className="text-sm text-muted-foreground">Battery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={batteryPercentage}
                      className={`w-24 bg-muted ${batteryPercentage > 20 ? '[&>div]:bg-success' : '[&>div]:bg-destructive'}`}
                    />
                    <span
                      className={`text-sm ${batteryPercentage > 20 ? 'text-success' : 'text-destructive'}`}
                    >
                      {batteryPercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={toggleConnection}
                  className={`flex-1 ${
                    isConnected
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30'
                      : 'bg-success/10 text-success hover:bg-success/20 border-success/30'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleArmed}
                  disabled={!isConnected}
                  className={`flex-1 ${
                    isArmed
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30'
                      : 'bg-success/10 text-success hover:bg-success/20 border-success/30'
                  }`}
                >
                  {isArmed ? 'Disarm' : 'Arm'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Connection Card */}
          <Card className="bg-card border-border shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <CardTitle className="text-lg font-semibold text-foreground">
                API Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      type="text"
                      placeholder="Host (e.g. localhost)"
                      value={tcpHost}
                      onChange={(e) => setTcpHost(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      placeholder="Port"
                      value={tcpPort}
                      onChange={(e) => setTcpPort(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              {/* API Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isTcpConnected ? (
                      <Link2 className="text-success" size={20} />
                    ) : (
                      <Link2Off className="text-muted-foreground" size={20} />
                    )}
                    <span className="text-sm text-muted-foreground">OpenAPI Status</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${isTcpConnected ? 'bg-success/10 text-success border-success/20' : 'bg-muted/50 text-muted-foreground border-border'}`}
                  >
                    {isTcpConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={isTcpConnected ? disconnectFromTcpServer : connectToTcpServer}
                  className={`flex-1 ${
                    isTcpConnected
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30'
                      : 'bg-success/10 text-success hover:bg-success/20 border-success/30'
                  }`}
                >
                  {isTcpConnected ? 'Disconnect TCP' : 'Connect TCP'}
                </Button>
                <Button
                  variant="outline"
                  onClick={sendTestData}
                  disabled={!isTcpConnected}
                  className="flex-1"
                >
                  Send Test Shot
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
