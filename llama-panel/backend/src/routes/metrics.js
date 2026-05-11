import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { getSystemMetrics, getGpuMetrics } from '../services/system.js'
import { getLlamaStatus } from '../services/llama.js'
import { getServiceStatus } from '../services/config.js'
import { loadMetricsConfig, collectMetricData } from '../services/metrics-config.js'

const router = Router()

// Protect all routes
router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const [system, llama, services, gpu] = await Promise.all([
      getSystemMetrics(),
      getLlamaStatus(),
      getServiceStatus(),
      getGpuMetrics(),
    ])

    // Extract flat token/request counts from Prometheus metrics
    const m = llama?.metrics || {}
    const totalTokens = (m['llamacpp:prompt_tokens_total'] || 0) + (m['llamacpp:tokens_predicted_total'] || 0)
    const tokensPerSec = m['llamacpp:predicted_tokens_seconds'] || 0

    // Collect all enabled metrics from config
    const metricsConfig = await loadMetricsConfig()
    const enabledMetrics = metricsConfig.filter(mc => mc.enabled)
    const customMetrics = await Promise.all(
      enabledMetrics.map(mc => collectMetricData(mc))
    )

    // Build flat metrics object with all metrics
    const allMetrics = {}
    customMetrics.forEach(cm => {
      // Map metric id to value (handle different types)
      if (cm.id === 'cpu') {
        allMetrics.cpu = system.cpu || { usage: cm.value || 0 }
      } else if (cm.id === 'memory') {
        allMetrics.memory = system.memory || { percent: cm.value || 0 }
      } else if (cm.id === 'gpu') {
        allMetrics.gpu = gpu || { usage: cm.value || 0 }
      } else if (cm.id === 'gpu-temp') {
        allMetrics.gpuTemp = cm.value || 0
      } else if (cm.id === 'gpu-power') {
        allMetrics.gpuPower = cm.value || 0
      } else if (cm.id === 'tokens') {
        allMetrics.tokens = { total: cm.value || totalTokens }
      } else if (cm.id === 'requests') {
        allMetrics.requests = cm.value || llama?.metrics?.['llamacpp:n_decode_total'] || 0
      } else if (cm.id === 'tokens-per-sec') {
        allMetrics.tokensPerSec = cm.value || tokensPerSec
      } else if (cm.id === 'temperature') {
        allMetrics.temperature = cm.value || 0
      } else if (cm.id === 'load') {
        allMetrics.load = system.load || { one: cm.value || 0 }
      } else if (cm.id === 'disk') {
        allMetrics.disk = system.filesystem || { percent: cm.value || 0 }
      } else if (cm.id === 'cpu-fan') {
        allMetrics.cpuFan = cm.value || 0
      } else {
        // For custom metrics, store by id
        allMetrics[cm.id] = cm.value
      }
    })

    // Flatten into single-level object matching frontend expectations
    res.json({
      timestamp: new Date().toISOString(),
      // From system (with overrides from collected metrics)
      cpu: allMetrics.cpu || system.cpu,
      memory: allMetrics.memory || system.memory,
      load: allMetrics.load || system.load,
      disk: allMetrics.disk || system.filesystem,
      temperature: allMetrics.temperature !== undefined ? allMetrics.temperature : (system.cpu?.temperature || 0),
      // From llama (flat)
      tokens: allMetrics.tokens || {
        total: totalTokens,
        prompt: m['llamacpp:prompt_tokens_total'] || 0,
        predicted: m['llamacpp:tokens_predicted_total'] || 0,
      },
      requests: allMetrics.requests !== undefined ? allMetrics.requests : (llama?.metrics?.['llamacpp:n_decode_total'] || 0),
      tokensPerSec: allMetrics.tokensPerSec ?? tokensPerSec,
      // From services
      services: services,
      // From gpu
      gpu: allMetrics.gpu || gpu,
      gpuPower: allMetrics.gpuPower !== undefined ? allMetrics.gpuPower : (gpu?.powerDraw || 0),
      gpuTemp: allMetrics.gpuTemp !== undefined ? allMetrics.gpuTemp : (gpu?.temperature || 0),
      // Custom metrics
      cpuFan: allMetrics.cpuFan || 0,
      // Nested llama data for status display
      llama,
    })
  } catch (err) {
    console.error('Metrics error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
