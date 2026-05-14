import { WebSocketServer } from 'ws'
import { verifyToken } from './auth.js'

class WebSocketManager {
  constructor() {
    this.wss = null
    this.clients = new Set()
    this.metricsInterval = null
    this.collectFn = null
  }

  init(server, collectFn) {
    this.wss = new WebSocketServer({ server, path: '/ws' })
    this.collectFn = collectFn

    this.wss.on('connection', (ws, raw) => {
      // Authenticate via query parameter: /ws?token=xxx
      const url = raw.url
      const tokenMatch = url.match(/[?&]token=([^&]+)/)
      if (tokenMatch) {
        const decoded = verifyToken(tokenMatch[1])
        if (!decoded) {
          ws.close(4001, 'Unauthorized')
          return
        }
        ws.user = decoded
      } else if (process.env.NODE_ENV !== 'test') {
        ws.close(4001, 'Token required')
        return
      }
      this.clients.add(ws)

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
        } catch {
          // Ignore parse errors
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
      })

      ws.on('error', (_err) => {
        // eslint-disable-next-line no-console
        console.error('WebSocket error:', _err.message)
        this.clients.delete(ws)
      })

      // Send initial metrics immediately
      this.sendToClient(ws)
    })

    // Collect and broadcast every 2 seconds
    this.metricsInterval = setInterval(() => {
      this.broadcast()
    }, 2000)
  }

  async sendToClient(ws) {
    try {
      const metrics = this.collectFn ? await this.collectFn() : null
      if (metrics) {
        ws.send(JSON.stringify({
          type: 'metrics',
          data: metrics,
          timestamp: Date.now(),
        }))
      }
    } catch (_err) {
      // eslint-disable-next-line no-console
      console.error('Failed to send metrics:', _err.message)
    }
  }

  async broadcast() {
    const payload = JSON.stringify({
      type: 'metrics',
      data: await this.collectFn?.(),
      timestamp: Date.now(),
    })

    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(payload)
      }
    }
  }

  get clientCount() {
    return this.clients.size
  }

  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    this.wss?.close()
    this.clients.clear()
  }
}

export default new WebSocketManager()
