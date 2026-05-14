import axios from 'axios'
import { InferenceDriver } from './base.js'

export class VLLMDriver extends InferenceDriver {
  constructor(config = {}) {
    super({
      name: config.name || 'vllm',
      type: 'vllm',
      url: config.url || process.env.VLLM_URL || 'http://127.0.0.1:8000',
      enabled: config.enabled !== false,
    })
  }

  async getStatus() {
    try {
      const [statusRes, modelsRes] = await Promise.all([
        axios.get('/status', { baseURL: this.url, timeout: 5000 }),
        axios.get('/v1/models', { baseURL: this.url, timeout: 5000 }),
      ])

      const data = statusRes.data
      const models = modelsRes.data?.data || []

      return {
        status: data?.ready ? 'running' : 'unavailable',
        model: models.length > 0 ? models[0].id : 'unknown',
        gpu_count: data?.gpu_count || 0,
        max_model_len: data?.max_model_len,
        models: models.map(m => ({ id: m.id, owner: m.owner })),
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return { status: 'offline', error: 'vLLM server not reachable' }
      }
      return { status: 'error', error: err.message }
    }
  }

  async getModelInfo() {
    try {
      const res = await axios.get('/v1/models', { baseURL: this.url, timeout: 5000 })
      const models = res.data?.data || []
      return {
        model: models.length > 0 ? models[0].id : 'unknown',
        models: models.map(m => ({ id: m.id, root: m.root })),
      }
    } catch {
      return { model: 'unknown', models: [] }
    }
  }
}
