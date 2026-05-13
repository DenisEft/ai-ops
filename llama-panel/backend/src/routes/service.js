import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { controlService, getSystemdServiceStatus } from '../services/llama.js'
import { getConfig, updateConfig } from '../services/config.js'
import { getStats } from '../services/stats.js'
import { exec } from 'child_process'
import { promisify } from 'util'


const router = Router()
const execAsync = promisify(exec)

// Protect all routes
router.use(authenticateToken)

// Known services
const KNOWN_SERVICES = [
  { name: 'llama-8080.service', label: 'llama-8080', type: 'llama' },
  { name: 'llama-panel.service', label: 'llama-panel', type: 'panel' },
]

// List all services with status
router.get('/list', async (req, res) => {
  try {
    const services = []
    for (const svc of KNOWN_SERVICES) {
      const status = await getSystemdServiceStatus(svc.name)
      services.push({ ...svc, ...status })
    }
    res.json(services)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Control any service
router.post('/control', async (req, res) => {
  const { name, action } = req.body

  if (!name || !action) {
    return res.status(400).json({ error: 'name and action are required' })
  }

  const validActions = ['start', 'stop', 'restart', 'reload', 'status']
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(', ')}` })
  }

  const svc = KNOWN_SERVICES.find(s => s.name === name || s.label === name)
  if (!svc) {
    return res.status(404).json({ error: `Unknown service: ${name}` })
  }

  try {
    const result = await controlService(action, svc.name)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get logs for a service
router.get('/logs', async (req, res) => {
  const { name, lines = 50 } = req.query
  if (!name) return res.status(400).json({ error: 'name is required' })

  const svc = KNOWN_SERVICES.find(s => s.name === name || s.label === name)
  if (!svc) return res.status(404).json({ error: `Unknown service: ${name}` })

  try {
    const { stdout } = await execAsync(
      `journalctl -u ${svc.name} -n ${lines} --no-pager -q 2>/dev/null`,
      { timeout: 5000 }
    )
    res.json({ name: svc.label, lines: parseInt(lines), logs: stdout.trim() })
  } catch {
    res.json({ name: svc.label, lines: 0, logs: 'Unable to read logs (journalctl not available)' })
  }
})

// Llama config
router.get('/config', async (req, res) => {
  try {
    const config = await getConfig()
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/config', async (req, res) => {
  try {
    const result = await updateConfig(req.body)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Stats - token usage history
router.get('/stats', async (req, res) => {
  const { period = '7d', limit = 100 } = req.query
  try {
    const stats = await getStats({ period, limit })
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
