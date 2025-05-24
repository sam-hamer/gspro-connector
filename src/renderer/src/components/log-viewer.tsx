import { useEffect, useState } from 'react'
import { ScrollArea } from './ui/scroll-area'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'

export function LogViewer(): JSX.Element {
  const [logs, setLogs] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchLogs = async (): Promise<void> => {
    try {
      setIsRefreshing(true)
      const content = await window.electronAPI.logger.getLogs()
      setLogs(content)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
    // Refresh logs every 5 seconds
    const interval = setInterval(fetchLogs, 5000)
    return (): void => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Log Contents</h3>
        <Button variant="ghost" size="sm" onClick={() => void fetchLogs()} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <ScrollArea className="h-[300px] w-full rounded-md border p-4">
        <pre className="text-sm font-mono whitespace-pre-wrap">{logs}</pre>
      </ScrollArea>
    </div>
  )
}
