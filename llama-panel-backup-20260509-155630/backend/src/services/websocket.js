import { WebSocketServer } from 'ws'

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

    this.wss.on('connection', (ws) => {
      this.clients.add(ws)

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
        } catch (err) {
          // Ignore parse errors
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
      })

      ws.on('error', (err) => {
        console.error('WebSocket error:', err.message)
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
    } catch (err) {
      console.error('Failed to send metrics:', err.message)
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
