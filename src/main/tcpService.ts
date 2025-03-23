import { Socket } from 'net'

export class TcpService {
  private socket: Socket | null = null
  private isConnected = false

  async connect(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket = new Socket()
      this.socket.connect(port, host, () => {
        this.isConnected = true
        console.log('TCP connection established')
        if (!global.mainWindow) {
          console.error('Main window reference not available')
          return
        }
        global.mainWindow.webContents.send('tcp:data', {
          type: 'connection_status',
          status: 'connected'
        })
        resolve(true)
      })

      this.socket.on('error', (error) => {
        this.isConnected = false
        console.log('TCP connection error:', error.message)
        if (!global.mainWindow) {
          console.error('Main window reference not available')
          return
        }
        global.mainWindow.webContents.send('tcp:data', {
          type: 'connection_status',
          status: 'error',
          error: error.message
        })
        resolve(false)
      })

      this.socket.on('close', () => {
        this.isConnected = false
        console.log('TCP connection closed')
        if (!global.mainWindow) {
          console.error('Main window reference not available')
          return
        }
        global.mainWindow.webContents.send('tcp:data', {
          type: 'connection_status',
          status: 'closed'
        })
      })

      this.socket.on('data', (data) => {
        try {
          const jsonData = JSON.parse(data.toString())
          // Send received data back to renderer
          console.log('Received data:', jsonData)
          if (!global.mainWindow) {
            console.error('Main window reference not available')
            return
          }
          global.mainWindow.webContents.send('tcp:data', jsonData)
        } catch (error) {
          console.error('Error parsing TCP data:', error)
        }
      })
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.end()
      this.socket = null
      this.isConnected = false
    }
  }

  async sendJson(data: unknown): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      return false
    }

    return new Promise((resolve) => {
      const jsonString = JSON.stringify(data)
      console.log('Sending data:', jsonString)
      this.socket!.write(jsonString + '\n', (error) => {
        if (error) {
          console.error('Error sending TCP data:', error)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  isConnectedToServer(): boolean {
    return this.isConnected
  }
}

export const tcpService = new TcpService()
