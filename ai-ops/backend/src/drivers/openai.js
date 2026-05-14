import axios from 'axios'
import { InferenceDriver } from './base.js'

export class OpenAIDriver extends InferenceDriver {
  constructor(config = {}) {
    super({
      name: config.name || 'openai',
      type: 'openai',
      url: config.url || process.env.OPENAI_URL || 'https://api.openai.com/v1',
      enabled: config.enabled !== false,
    })
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || ''
  }

  async getStatus() {
    try {
      const res = await axios.get('/models', {
        baseURL: this.url,
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        timeout: 5000,
      })

      const models = res.data?.data || []
      return {
        status: 'running',
        modelsCount: models.length,
        models: models.slice(0, 10).map(m => ({
          id: m.id,
          object: m.object,
          owned_by: m.owned_by,
        })),
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return { status: 'offline', error: 'API not reachable' }
      }
      return { status: 'error', error: err.message }
    }
  }

  async getModelInfo() {
    try {
      const res = await axios.get('/models', {
        baseURL: this.url,
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        timeout: 5000,
      })
      const models = res.data?.data || []
      return {
        models: models.map(m => ({
          id: m.id,
          owned_by: m.owned_by,
        })),
      }
    } catch {
      return { models: [] }
    }
  }
}
