import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import {
  loadMetricsConfig,
  addCustomMetric,
  removeMetric,
  toggleMetric,
  updateMetric,
  collectMetricData
} from '../services/metrics-config.js'

const router = Router()
router.use(authenticateToken)

// Get all metrics configuration
router.get('/', async (req, res) => {
  try {
    const metrics = await loadMetricsConfig()
    res.json({ metrics })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Collect all enabled metrics at once (MUST be before /:id)
router.post('/collect', async (req, res) => {
  try {
    const metrics = await loadMetricsConfig()
    const enabled = metrics.filter(m => m.enabled)
    
    const results = await Promise.all(
      enabled.map(m => collectMetricData(m))
    )
    
    res.json({ metrics: results, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add a custom metric (MUST be before /:id)
router.post('/add', async (req, res) => {
  try {
    const metric = await addCustomMetric(req.body)
    res.json({ success: true, metric })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Collect data for a single metric
router.get('/:id', async (req, res) => {
  try {
    const metrics = await loadMetricsConfig()
    const metric = metrics.find(m => m.id === req.params.id)
    if (!metric) {
      return res.status(404).json({ error: `Метрика "${req.params.id}" не найдена` })
    }
    
    const data = await collectMetricData(metric)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Remove a metric
router.delete('/:id', async (req, res) => {
  try {
    const result = await removeMetric(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// Toggle metric enabled state
router.patch('/:id/toggle', async (req, res) => {
  try {
    const result = await toggleMetric(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// Update metric configuration
router.patch('/:id', async (req, res) => {
  try {
    const metric = await updateMetric(req.params.id, req.body)
    res.json(metric)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

export default router
