'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Switch } from '../../components/ui/switch'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { LogLevel } from '../../../../utils/types'
import { Button } from '../../components/ui/button'

export default function Settings(): JSX.Element {
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(true)
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO)

  useEffect(() => {
    // Initialize settings from the main process
    window.electronAPI.logger.getLoggerSettings().then((settings) => {
      setIsLoggingEnabled(settings.isEnabled)
      setLogLevel(settings.logLevel)
    })
  }, [])

  const handleOpenLogsLocation = async (): Promise<void> => {
    await window.electronAPI.logger.openLogsLocation()
  }

  const handleLoggingToggle = async (enabled: boolean): Promise<void> => {
    setIsLoggingEnabled(enabled)
    await window.electronAPI.logger.setLoggerEnabled(enabled)
  }

  const handleLogLevelChange = async (level: LogLevel): Promise<void> => {
    setLogLevel(level)
    await window.electronAPI.logger.setLoggerLevel(level)
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <header className="container mx-auto max-w-5xl mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <main className="container mx-auto max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Logging Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle logging functionality throughout the application
                </p>
              </div>
              <Switch checked={isLoggingEnabled} onCheckedChange={handleLoggingToggle} />
            </div>

            <div className="space-y-2">
              <Label>Log Level</Label>
              <div className="flex justify-between">
                <Select value={logLevel} onValueChange={handleLogLevelChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select log level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LogLevel.DEBUG}>Debug</SelectItem>
                    <SelectItem value={LogLevel.INFO}>Info</SelectItem>
                    <SelectItem value={LogLevel.WARN}>Warning</SelectItem>
                    <SelectItem value={LogLevel.ERROR}>Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleOpenLogsLocation}>
                  Open Logs Location
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Set the minimum level of logs to display
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
