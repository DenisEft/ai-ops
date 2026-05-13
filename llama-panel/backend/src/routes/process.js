import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { requirePermission } from '../services/rbac.js'
import { getProcessMonitor } from '../services/process-monitor.js'

const router = Router()

// Protect all routes
router.use(authenticateToken)

const monitor = getProcessMonitor({
  ports: [parseInt(process.env.LLAMA_PORT) || 8080],
  autoRestart: process.env.AUTO_RESTART === 'true'
})

// GET /api/process/status — полный отчёт
router.get('/status', async (req, res) => {
  try {
    const report = await monitor.fullCheck()
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/process/alerts — последние алерты
router.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  res.json(monitor.getAlerts(limit))
})

// POST /api/process/restart — ручной рестарт
router.post('/restart', requirePermission('service:control'), async (req, res) => {
  const serviceName = req.body.service || process.env.SERVICE_NAME || 'llama-8080.service'
  try {
    const result = await monitor.autoRestartService(serviceName)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/process/history — история метрик
router.get('/history', (req, res) => {
  const { from, to, limit } = req.query
  const entries = monitor.getHistory(
    from ? new Date(from).getTime() : Date.now() - 86400000,
    to ? new Date(to).getTime() : Date.now()
  )

  const sorted = entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const result = limit ? sorted.slice(0, parseInt(limit)) : sorted
  res.json(result)
})

export default router
