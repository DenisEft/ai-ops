import 'dotenv/config'
import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import metricsRoutes from './routes/metrics.js'
import metricsConfigRoutes from './routes/metrics-config.js'
import serviceRoutes from './routes/service.js'
import authRoutes from './routes/auth.js'
import processRoutes from './routes/process.js'
import backupRoutes from './routes/backup.js'
import auditRoutes from './routes/audit.js'
import openclawRoutes from './routes/openclaw.js'
import dashboardRoutes from './routes/dashboard.js'
import wsManager from './services/websocket.js'
import * as systemService from './services/system.js'
import { getLlamaStatus } from './services/llama.js'
import * as configService from './services/config.js'
import * as openclawService from './services/openclaw.js'
import { getMetricsHistory } from './services/metrics-history.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDist = path.join(__dirname, '../../frontend/dist')

const app = express()
const PORT = process.env.PORT || 8081
const HOST = process.env.HOST || '0.0.0.0'

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app)

// Middleware — MUST be before routes
app.use(express.json())

// CORS — dynamic origin from request, fallback to localhost
app.use((req, res, next) => {
  const origin = req.headers.origin || 'http://localhost:8081'
  res.header('Access-Control-Allow-Origin', origin)
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    return res.sendStatus(204)
  }
  next()
})

// Auth endpoints — public (except verify)
app.use('/api/auth', authRoutes)

// Routes — MUST be before static/SPA fallback
app.use('/api/metrics', metricsRoutes)
app.use('/api/metrics-config', metricsConfigRoutes)
app.use('/api/service', serviceRoutes)
app.use('/api/process', processRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/openclaw', openclawRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// No-cache for index.html (SPA entry)
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(frontendDist, 'index.html'))
})

// Serve frontend static files (JS, CSS, images) - NO cache to prevent stale bundles
app.use(express.static(frontendDist, { maxAge: '0', etag: false }))

// SPA fallback
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(frontendDist, 'index.html'))
})

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize WebSocket with metrics collection
wsManager.init(server, async () => {
  const [system, gpu, llama, service, openclaw] = await Promise.all([
    systemService.getSystemMetrics(),
    systemService.getGpuMetrics(),
    getLlamaStatus(),
    configService.getServiceStatus(),
    openclawService.getStatus(),
  ])
  return { timestamp: new Date().toISOString(), system, gpu, llama, service, openclaw }
})

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Llama Panel API running on http://${HOST}:${PORT}`)
  // eslint-disable-next-line no-console
  console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`)
  // eslint-disable-next-line no-console
  console.log(`⚙️  Service: http://localhost:${PORT}/api/service`)
  // eslint-disable-next-line no-console
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/ws`)
  // eslint-disable-next-line no-console
  console.log(`🤖 OpenClaw: http://localhost:${PORT}/api/openclaw`)
  // eslint-disable-next-line no-console
  console.log(`💡 Auto-refresh: every 2s for connected clients`)
})

// Background metrics collector — stores snapshots every 30s
const metricsHistory = getMetricsHistory()
setInterval(async () => {
  try {
    const [system, gpu, llama] = await Promise.allSettled([
      systemService.getSystemMetrics(),
      systemService.getGpuMetrics(),
      getLlamaStatus(),
    ])
    const s = system.status === 'fulfilled' ? system.value : {}
    const g = gpu.status === 'fulfilled' ? gpu.value : {}
    const l = llama.status === 'fulfilled' ? llama.value : {}
    const m = l?.metrics || {}
    const totalTokens = (m['llamacpp:prompt_tokens_total'] || 0) + (m['llamacpp:tokens_predicted_total'] || 0)
    metricsHistory.store({
      cpu: s?.cpu?.usage ?? 0,
      memory: s?.memory?.percent ?? 0,
      gpu: g?.memoryPercent ?? 0,
      gpuTemp: g?.temperature ?? 0,
      vramUsed: g?.memoryUsed ?? 0,
      vramTotal: g?.memoryTotal ?? 1,
      tokensPerSec: m['llamacpp:predicted_tokens_seconds'] || 0,
      tokensTotal: totalTokens,
      llamaTps: l?.tokens_per_second || 0,
      llamaDecoded: m['llama_tokens_decoded'] || 0,
    })
  } catch (e) {
    // Silently skip — don't spam logs
  }
}, 30000)

export default app
