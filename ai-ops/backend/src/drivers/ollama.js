import axios from 'axios'
import { InferenceDriver } from './base.js'

export class OllamaDriver extends InferenceDriver {
  constructor(config = {}) {
    super({
      name: config.name || 'ollama',
      type: 'ollama',
      url: config.url || process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
      enabled: config.enabled !== false,
    })
  }

  async getStatus() {
    try {
      const [healthRes, tagsRes] = await Promise.all([
        axios.get('/api/version', { baseURL: this.url, timeout: 5000 }),
        axios.get('/api/tags', { baseURL: this.url, timeout: 5000 }),
      ])

      const models = tagsRes.data?.models || []

      return {
        status: 'running',
        version: healthRes.data?.version || 'unknown',
        models: models.length,
        modelList: models.map(m => ({
          name: m.name,
          size: m.size,
          digest: m.digest?.substring(0, 8),
        })),
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return { status: 'offline', error: 'Ollama server not reachable' }
      }
      return { status: 'error', error: err.message }
    }
  }

  async getModelInfo() {
    try {
      const res = await axios.get('/api/tags', { baseURL: this.url, timeout: 5000 })
      const models = res.data?.models || []
      return {
        models: models.map(m => ({
          name: m.name,
          size: m.size,
          details: m.details,
        })),
      }
    } catch {
      return { models: [] }
    }
  }
}
