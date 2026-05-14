import axios from 'axios'
import { InferenceDriver } from './base.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function parsePrometheusMetrics(text) {
  const result = {}
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue
    const parts = line.split(' ')
    if (parts.length >= 2) {
      const name = parts[0]
      const value = parseFloat(parts[parts.length - 1])
      if (!isNaN(value)) {
        result[name] = value
      }
    }
  }
  return result
}

export class LlamaDriver extends InferenceDriver {
  constructor(config = {}) {
    super({
      name: config.name || 'llama',
      type: 'llama',
      url: config.url || process.env.LLAMA_URL || 'http://127.0.0.1:8080',
      enabled: config.enabled !== false,
    })
    this.modelPath = config.modelPath || ''
    this.serviceName = config.serviceName || 'llama-8080.service'
  }

  async getStatus() {
    try {
      const health = await axios.get('/health', {
        baseURL: this.url,
        timeout: 5000,
      })

      const props = await axios.get('/props', {
        baseURL: this.url,
        timeout: 5000,
      })

      let metricsData = null
      let metricsError = null
      try {
        const metricsRes = await axios.get('/metrics', {
          baseURL: this.url,
          timeout: 5000,
        })
        metricsData = parsePrometheusMetrics(metricsRes.data)
      } catch (e) {
        if (e.response?.status === 501) {
          metricsError = 'Metrics not enabled (need --metrics flag)'
        } else {
          metricsError = e.message
        }
      }

      return {
        status: 'running',
        health: health.data,
        props: props.data,
        metrics: metricsData,
        metricsError,
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return { status: 'offline', error: `${this.name} server not reachable` }
      }
      return { status: 'error', error: err.message }
    }
  }

  async getModelInfo() {
    try {
      const props = await axios.get('/props', {
        baseURL: this.url,
        timeout: 5000,
      })
      return {
        model: props.data.model || 'unknown',
        modelPath: props.data.model_path || this.modelPath,
        vocabSize: props.data.vocab_size,
        contextSize: props.data.n_ctx,
      }
    } catch {
      return { model: 'unknown', modelPath: this.modelPath }
    }
  }

  async getServiceStatus() {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${this.serviceName} 2>/dev/null`)
      const active = stdout.trim() === 'active'
      return { active, name: this.serviceName, type: 'llama' }
    } catch {
      return { active: false, name: this.serviceName, type: 'llama' }
    }
  }
}
