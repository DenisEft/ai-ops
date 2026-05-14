/**
 * Base driver interface for AI inference backends.
 * All drivers must implement these methods.
 */

export class InferenceDriver {
  /**
   * @param {Object} config - Driver-specific config
   */
  constructor(config = {}) {
    this.name = config.name || 'unknown'
    this.url = config.url || ''
    this.type = config.type || 'generic' // llama, vllm, tgi, ollama, openai
    this.enabled = config.enabled !== false
  }

  /**
   * Check if the inference server is reachable and return status
   * @returns {Promise<Object>} Status object with status, metrics, etc.
   */
  async getStatus() {
    throw new Error('getStatus() must be implemented by driver')
  }

  /**
   * Get model information
   * @returns {Promise<Object>} Model info
   */
  async getModelInfo() {
    throw new Error('getModelInfo() must be implemented by driver')
  }

  /**
   * Get system metrics (CPU, RAM, GPU, etc.)
   * @returns {Promise<Object>} Metrics
   */
  async getMetrics() {
    throw new Error('getMetrics() must be implemented by driver')
  }

  /**
   * Check health endpoint
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const res = await fetch(`${this.url}/health`, { timeout: 5000 })
      return res.ok
    } catch {
      return false
    }
  }
}
