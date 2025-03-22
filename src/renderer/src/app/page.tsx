'use client'

import { useState, useEffect } from 'react'
import { Battery, Bluetooth, Signal, Power, Link2, Link2Off, MoreVertical } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { bluetoothManager } from '../../../utils/bluetooth'

export default function LaunchMonitorConnector(): JSX.Element {
  const [isConnected, setIsConnected] = useState(false)
  const [isArmed, setIsArmed] = useState(false)
  const [batteryPercentage, setBatteryPercentage] = useState(75)
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [apiStatus, setApiStatus] = useState('Disconnected')
  const [showPairingPrompt, setShowPairingPrompt] = useState(false)
  const [showDeviceList, setShowDeviceList] = useState(false)
  const [devices, setDevices] = useState<Array<{ deviceId: string; deviceName?: string }>>([])

  useEffect(() => {
    // Register Bluetooth pairing request handler
    console.log('Setting up Bluetooth pairing request handler')
    const handler = (): void => {
      console.log('Bluetooth pairing request received')
      setShowPairingPrompt(true)
    }
    window.electronAPI.bluetoothPairingRequest(handler)
  }, [])

  useEffect(() => {
    // Listen for devices found
    window.electronAPI.onBluetoothDevicesFound(
      (deviceList: { deviceId: string; deviceName?: string }[]) => {
        console.log('Devices found:', deviceList)
        setDevices(deviceList)
        setShowDeviceList(true)
      }
    )
  }, [])

  const handlePairingResponse = (accept: boolean): void => {
    console.log('Handling pairing response:', accept)
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
    console.log('toggleConnection :: start')
    if (!isConnected) {
      try {
        console.log('Attempting to discover devices...')
        await bluetoothManager.discoverDevicesAsync()
        console.log('Device discovery initiated')
      } catch (error) {
        console.error('Error during device discovery:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
          if (error.stack) {
            console.error('Stack trace:', error.stack)
          }
        }
        return // Don't set isConnected to true if there was an error
      }
    } else {
      try {
        console.log('Attempting to disconnect...')
        await bluetoothManager.disconnectDeviceAsync()
        console.log('Device disconnected')
      } catch (error) {
        console.error('Error disconnecting:', error)
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

  const toggleApiConnection = (): void => {
    setIsApiConnected((prev) => !prev)
    setApiStatus(isApiConnected ? 'Disconnected' : 'Connected')
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bluetooth
                      className={`${isConnected ? 'text-success' : 'text-muted-foreground'}`}
                      size={20}
                    />
                    <span className="text-sm text-muted-foreground">Connection</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${isConnected ? 'bg-success/10 text-success border-success/20' : 'bg-muted/50 text-muted-foreground border-border'}`}
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

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
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreVertical size={20} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isApiConnected ? (
                      <Link2 className="text-success" size={20} />
                    ) : (
                      <Link2Off className="text-muted-foreground" size={20} />
                    )}
                    <span className="text-sm text-muted-foreground">API Status</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${isApiConnected ? 'bg-success/10 text-success border-success/20' : 'bg-muted/50 text-muted-foreground border-border'}`}
                  >
                    {apiStatus}
                  </Badge>
                </div>

                {/* Data Sync Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Signal
                      className={`${isApiConnected ? 'text-success' : 'text-muted-foreground'}`}
                      size={20}
                    />
                    <span className="text-sm text-muted-foreground">Data Sync</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${isApiConnected ? 'bg-success/10 text-success border-success/20' : 'bg-muted/50 text-muted-foreground border-border'}`}
                  >
                    {isApiConnected ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* API Action Button */}
              <Button
                variant="outline"
                onClick={toggleApiConnection}
                className={`w-full ${
                  isApiConnected
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30'
                    : 'bg-success/10 text-success hover:bg-success/20 border-success/30'
                }`}
              >
                {isApiConnected ? 'Disconnect API' : 'Connect API'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
