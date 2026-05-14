/**
 * Driver registry — manages all inference backends.
 * Reads config from environment or config file.
 */

import { LlamaDriver } from './llama.js'
import { VLLMDriver } from './vllm.js'
import { TGIDriver } from './tgi.js'
import { OllamaDriver } from './ollama.js'
import { OpenAIDriver } from './openai.js'

// Default driver list — can be overridden by env vars
const DEFAULT_DRIVERS = [
  { type: 'llama', enabled: true },
  { type: 'vllm', enabled: false },
  { type: 'tgi', enabled: false },
  { type: 'ollama', enabled: false },
  { type: 'openai', enabled: false },
]

export class DriverRegistry {
  constructor() {
    this.drivers = new Map()
    this._loadDrivers()
  }

  _loadDrivers() {
    const config = this._readConfig()

    for (const driverDef of DEFAULT_DRIVERS) {
      if (!driverDef.enabled) continue

      const driverConfig = { ...config[driverDef.type] || {}, enabled: true }

      switch (driverDef.type) {
        case 'llama':
          this.drivers.set('llama', new LlamaDriver(driverConfig))
          break
        case 'vllm':
          this.drivers.set('vllm', new VLLMDriver(driverConfig))
          break
        case 'tgi':
          this.drivers.set('tgi', new TGIDriver(driverConfig))
          break
        case 'ollama':
          this.drivers.set('ollama', new OllamaDriver(driverConfig))
          break
        case 'openai':
          this.drivers.set('openai', new OpenAIDriver(driverConfig))
          break
      }
    }
  }

  _readConfig() {
    return {
      llama: {
        url: process.env.LLAMA_URL || 'http://127.0.0.1:8080',
        modelPath: process.env.LLAMA_MODEL_PATH || '',
        serviceName: process.env.LLAMA_SERVICE_NAME || 'llama-8080.service',
      },
      vllm: {
        url: process.env.VLLM_URL || 'http://127.0.0.1:8000',
      },
      tgi: {
        url: process.env.TGI_URL || 'http://127.0.0.1:8080',
      },
      ollama: {
        url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
      },
      openai: {
        url: process.env.OPENAI_URL || 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
      },
    }
  }

  /**
   * Get all enabled drivers
   */
  getAll() {
    return Array.from(this.drivers.values())
  }

  /**
   * Get a driver by type
   */
  get(type) {
    return this.drivers.get(type)
  }

  /**
   * Get status from all drivers
   */
  async getAllStatus() {
    const results = {}
    for (const driver of this.getAll()) {
      try {
        results[driver.type] = await driver.getStatus()
      } catch (err) {
        results[driver.type] = { status: 'error', error: err.message }
      }
    }
    return results
  }

  /**
   * Get model info from all drivers
   */
  async getAllModels() {
    const results = {}
    for (const driver of this.getAll()) {
      try {
        results[driver.type] = await driver.getModelInfo()
      } catch (err) {
        results[driver.type] = { model: 'error' }
      }
    }
    return results
  }

  /**
   * Get metrics from all drivers
   */
  async getAllMetrics() {
    const results = {}
    for (const driver of this.getAll()) {
      try {
        const status = await driver.getStatus()
        if (status.metrics) {
          results[driver.type] = status.metrics
        }
      } catch {}
    }
    return results
  }
}

// Singleton instance
export const driverRegistry = new DriverRegistry()
