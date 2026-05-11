import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { getSystemMetrics, formatBytes } from '../services/system.js'
import { getLlamaStatus, getSystemdServiceStatus, getGpuMetrics } from '../services/llama.js'

const router = Router()

// Protect all routes
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const [system, llama, service, gpu] = await Promise.all([
      getSystemMetrics(),
      getLlamaStatus(),
      getSystemdServiceStatus(process.env.SERVICE_NAME || 'llama-8080.service'),
      getGpuMetrics(),
    ])

    res.json({
      timestamp: new Date().toISOString(),
      system,
      llama,
      service,
      gpu,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/history', async (req, res) => {
  // In production this would query a time-series DB
  // For now, return the latest snapshot
  const data = await getSystemMetrics()
  res.json({
    timestamp: new Date().toISOString(),
    ...data,
  })
})

export default router
