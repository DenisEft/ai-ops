import axios from 'axios'
import { InferenceDriver } from './base.js'

export class TGIDriver extends InferenceDriver {
  constructor(config = {}) {
    super({
      name: config.name || 'tgi',
      type: 'tgi',
      url: config.url || process.env.TGI_URL || 'http://127.0.0.1:8080',
      enabled: config.enabled !== false,
    })
  }

  async getStatus() {
    try {
      const [healthRes, infoRes] = await Promise.all([
        axios.get('/health', { baseURL: this.url, timeout: 5000 }),
        axios.get('/info', { baseURL: this.url, timeout: 5000 }),
      ])

      const health = healthRes.data
      const info = infoRes.data || {}

      return {
        status: health?.status === 'healthy' ? 'running' : 'unavailable',
        model: info?.model_id || 'unknown',
        version: info?.version || 'unknown',
        device: info?.device || 'unknown',
        max_concurrent_requests: info?.max_concurrent_requests,
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return { status: 'offline', error: 'TGI server not reachable' }
      }
      return { status: 'error', error: err.message }
    }
  }

  async getModelInfo() {
    try {
      const res = await axios.get('/info', { baseURL: this.url, timeout: 5000 })
      const info = res.data || {}
      return {
        model: info?.model_id,
        version: info?.version,
        device: info?.device,
      }
    } catch {
      return { model: 'unknown' }
    }
  }
}
