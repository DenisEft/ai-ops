import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import metricsRoutes from './routes/metrics.js'
import serviceRoutes from './routes/service.js'
import authRoutes from './routes/auth.js'
import wsManager from './services/websocket.js'
import * as systemService from './services/system.js'
import * as llamaService from './services/llama.js'
import * as configService from './services/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDist = path.join(__dirname, '../../frontend/dist')

const app = express()
const PORT = process.env.PORT || 8081
const HOST = process.env.HOST || '0.0.0.0'

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app)

// Middleware — MUST be before routes
app.use(express.json())

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})

// Auth endpoints — public (except verify)
app.use('/api/auth', authRoutes)

// Routes — MUST be before static/SPA fallback
app.use('/api/metrics', metricsRoutes)
app.use('/api/service', serviceRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// No-cache for index.html (SPA entry)
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(frontendDist, 'index.html'))
})

// Serve frontend static files (JS, CSS, images) - cache them
app.use(express.static(frontendDist, { maxAge: '1h' }))

// SPA fallback
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(frontendDist, 'index.html'))
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize WebSocket with metrics collection
wsManager.init(server, async () => {
  const [system, gpu, llama, service] = await Promise.all([
    systemService.getSystemMetrics(),
    systemService.getGpuMetrics(),
    llamaService.getLlamaStatus(),
    configService.getServiceStatus(),
  ])
  return { timestamp: new Date().toISOString(), system, gpu, llama, service }
})

server.listen(PORT, HOST, () => {
  console.log(`🚀 Llama Panel API running on http://${HOST}:${PORT}`)
  console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`)
  console.log(`⚙️  Service: http://localhost:${PORT}/api/service`)
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/ws`)
  console.log(`💡 Auto-refresh: every 2s for connected clients`)
})

export default app
