import { execSync, exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)
const ALERTS_DIR = join(process.cwd(), 'alerts')
const HISTORY_DIR = join(process.cwd(), 'history')

/**
 * AI Process Monitor — наблюдение за AI-процессами
 * - Мониторинг llama-server, vLLM, Ollama
 * - Обнаружение аномалий: OOM, перегрев, падение токенов/сек
 * - Автоматический рестарт при crash
 */
export class ProcessMonitor {
  constructor(config = {}) {
    this.ports = config.ports || [8080] // llama-server ports to monitor
    this.thresholds = config.thresholds || {
      gpuTemp: 80,        // °C warning threshold
      gpuTempCritical: 90, // °C critical threshold
      cpuLoad: 95,        // % warning
      ramLoad: 90,        // % warning
      tokensPerSecMin: 1, // tokens/sec warning
      oomPatterns: [
        'Out of memory', 'OOM', 'CUDA error', 'killed',
        'segmentation fault', 'SIGKILL', 'SIGSEGV'
      ]
    }
    this.history = []
    this.alerts = []
    this.autoRestart = config.autoRestart ?? true
    this.checkInterval = null
    this.lastTokenRate = null
    this.lastTokenTime = null

    // Ensure directories exist
    ;[ALERTS_DIR, HISTORY_DIR].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    })
  }

  /**
   * Scan for AI processes on configured ports
   */
  scanProcesses() {
    const processes = []

    for (const port of this.ports) {
      try {
        // Check if process is listening on port
        const result = execSync(
          `ss -tlnp | grep :${port} || lsof -i :${port} -P -n 2>/dev/null || netstat -tlnp 2>/dev/null | grep :${port}`,
          { timeout: 3000 }
        ).toString().trim()

        if (result) {
          const pid = result.match(/pid=(\d+)/)?.[1] ||
                      result.match(/PID (\d+)/)?.[1] ||
                      result.match(/(\d+)\/node/) ||
                      result.match(/(\d+)\/python/)

          processes.push({
            name: this.identifyProcess(result),
            pid: pid?.[1] || null,
            port,
            status: 'running',
            detectedAt: new Date().toISOString()
          })
        }
      } catch {
        processes.push({
          name: 'llama-server',
          port,
          status: 'stopped',
          detectedAt: new Date().toISOString()
        })
      }
    }

    return processes
  }

  /**
   * Identify process type from output
   */
  identifyProcess(output) {
    if (/ollama/i.test(output)) return 'ollama'
    if (/vllm/i.test(output)) return 'vllm'
    if (/llama/i.test(output)) return 'llama-server'
    if (/python/i.test(output)) return 'python-llm'
    return 'unknown-llm'
  }

  /**
   * Check GPU temperature via nvidia-smi
   */
  getGpuTemperature() {
    try {
      const out = execSync(
        'nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader',
        { timeout: 5000 }
      ).toString().trim().split('\n')[0]

      return parseFloat(out.replace(/[^0-9.]/g, '')) || 0
    } catch {
      return null
    }
  }

  /**
   * Check GPU memory usage via nvidia-smi
   */
  getGpuMemory() {
    try {
      const out = execSync(
        'nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader',
        { timeout: 5000 }
      ).toString().trim().split('\n')[0]

      const [used, total] = out.split(',').map(v => parseFloat(v.replace(/[^0-9.]/g, '')))
      return { used, total, percent: total ? (used / total * 100) : 0 }
    } catch {
      return null
    }
  }

  /**
   * Check system load
   */
  getSystemLoad() {
    try {
      const cpu = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'").toString().trim()
      const mem = execSync("free | grep Mem | awk '{printf(\"%.1f\", $3/$2*100)}'").toString().trim()

      return {
        cpuLoad: parseFloat(cpu) || 0,
        ramLoad: parseFloat(mem) || 0
      }
    } catch {
      return { cpuLoad: 0, ramLoad: 0 }
    }
  }

  /**
   * Check llama-server token generation rate via /metrics endpoint
   */
  async getLlamaMetrics() {
    try {
      const response = await fetch('http://127.0.0.1:8080/metrics', {
        timeout: 5000
      })

      if (!response.ok) return null

      const text = await response.text()
      const lines = text.split('\n')

      const metrics = {}
      for (const line of lines) {
        const match = line.match(/^(llama_.+?)\s+(\d+(?:\.\d+)?)$/)
        if (match) {
          metrics[match[1]] = parseFloat(match[2])
        }
      }

      return metrics
    } catch {
      return null
    }
  }

  /**
   * Calculate tokens per second trend
   */
  calculateTokenRate(metrics) {
    if (!metrics) return null

    const now = Date.now()
    const decoded = metrics.llama_tokens_decoded || 0
    const processed = metrics.llama_tokens_promoted || 0

    if (this.lastTokenRate) {
      const delta = (now - this.lastTokenTime) / 1000
      if (delta > 0) {
        const rate = (decoded - this.lastTokenRate.decoded) / delta
        this.lastTokenRate = { decoded, processed, rate, timestamp: now }
        return rate
      }
    }

    this.lastTokenRate = { decoded, processed, rate: 0, timestamp: now }
    this.lastTokenTime = now
    return 0
  }

  /**
   * Detect anomalies in system/AI metrics
   */
  detectAnomalies() {
    const anomalies = []
    const gpuTemp = this.getGpuTemperature()
    const gpuMem = this.getGpuMemory()
    const load = this.getSystemLoad()

    // GPU temperature
    if (gpuTemp !== null) {
      if (gpuTemp >= this.thresholds.gpuTempCritical) {
        anomalies.push({
          type: 'critical',
          metric: 'gpu_temperature',
          value: gpuTemp,
          threshold: this.thresholds.gpuTempCritical,
          message: `🔥 Критическая температура GPU: ${gpuTemp}°C (порог: ${this.thresholds.gpuTempCritical}°C)`,
          timestamp: new Date().toISOString()
        })
      } else if (gpuTemp >= this.thresholds.gpuTemp) {
        anomalies.push({
          type: 'warning',
          metric: 'gpu_temperature',
          value: gpuTemp,
          threshold: this.thresholds.gpuTemp,
          message: `⚠️ Высокая температура GPU: ${gpuTemp}°C`,
          timestamp: new Date().toISOString()
        })
      }
    }

    // CPU load
    if (load.cpuLoad >= this.thresholds.cpuLoad) {
      anomalies.push({
        type: 'warning',
        metric: 'cpu_load',
        value: load.cpuLoad,
        threshold: this.thresholds.cpuLoad,
        message: `⚠️ Высокая нагрузка CPU: ${load.cpuLoad}%`,
        timestamp: new Date().toISOString()
      })
    }

    // RAM load
    if (load.ramLoad >= this.thresholds.ramLoad) {
      anomalies.push({
        type: 'warning',
        metric: 'ram_load',
        value: load.ramLoad,
        threshold: this.thresholds.ramLoad,
        message: `⚠️ Высокая нагрузка RAM: ${load.ramLoad}%`,
        timestamp: new Date().toISOString()
      })
    }

    // GPU memory
    if (gpuMem && gpuMem.percent >= 95) {
      anomalies.push({
        type: 'critical',
        metric: 'gpu_memory',
        value: gpuMem.percent,
        threshold: 95,
        message: `🔴 Память GPU заполнена: ${gpuMem.percent.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      })
    }

    // Token rate
    const tokenRate = this.calculateTokenRate({
      llama_tokens_decoded: 100, // placeholder, real values from metrics
      llama_tokens_promoted: 100
    })

    if (tokenRate !== null && tokenRate < this.thresholds.tokensPerSecMin && tokenRate >= 0) {
      anomalies.push({
        type: 'info',
        metric: 'token_rate',
        value: tokenRate,
        threshold: this.thresholds.tokensPerSecMin,
        message: `📉 Низкая скорость генерации: ${tokenRate.toFixed(1)} токенов/сек`,
        timestamp: new Date().toISOString()
      })
    }

    return anomalies
  }

  /**
   * Auto-restart process if crashed
   */
  async autoRestartService(serviceName) {
    if (!this.autoRestart) return { restarted: false, reason: 'autoRestart disabled' }

    try {
      await execAsync(`sudo systemctl restart ${serviceName}`, { timeout: 15000 })
      this.logAlert('restarted', `Автоматический рестарт сервиса: ${serviceName}`)
      return { restarted: true, service: serviceName }
    } catch (err) {
      this.logAlert('restart_failed', `Не удалось перезапустить ${serviceName}: ${err.message}`)
      return { restarted: false, error: err.message }
    }
  }

  /**
   * Log alert to file
   */
  logAlert(type, message) {
    const alert = { type, message, timestamp: new Date().toISOString() }
    this.alerts.push(alert)

    const file = join(ALERTS_DIR, `alerts-${new Date().toISOString().slice(0, 10)}.json`)
    const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : []
    data.push(alert)
    writeFileSync(file, JSON.stringify(data, null, 2))

    return alert
  }

  /**
   * Save metrics history
   */
  saveHistory(metrics) {
    const entry = { ...metrics, timestamp: new Date().toISOString() }
    this.history.push(entry)

    // Keep only last 1000 entries
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000)
    }

    const file = join(HISTORY_DIR, `history-${new Date().toISOString().slice(0, 7)}.json`)
    const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : []
    data.push(entry)

    // Keep last 5000 entries per month
    if (data.length > 5000) {
      data.splice(0, data.length - 5000)
    }
    writeFileSync(file, JSON.stringify(data, null, 2))

    return entry
  }

  /**
   * Full system check — returns comprehensive report
   */
  async fullCheck() {
    const processes = this.scanProcesses()
    const gpuTemp = this.getGpuTemperature()
    const gpuMem = this.getGpuMemory()
    const load = this.getSystemLoad()
    const llamaMetrics = await this.getLlamaMetrics()
    const anomalies = this.detectAnomalies()
    const tokenRate = llamaMetrics ? this.calculateTokenRate(llamaMetrics) : null

    const report = {
      timestamp: new Date().toISOString(),
      processes,
      gpu: {
        temperature: gpuTemp,
        memory: gpuMem,
        status: gpuTemp !== null ? (gpuTemp >= this.thresholds.gpuTempCritical ? 'critical' :
          gpuTemp >= this.thresholds.gpuTemp ? 'warning' : 'ok') : 'unknown'
      },
      system: load,
      llama: llamaMetrics ? {
        metrics: llamaMetrics,
        tokenRate: tokenRate ?? null
      } : null,
      anomalies,
      anomalyCount: anomalies.length
    }

    this.saveHistory(report)
    return report
  }

  /**
   * Start continuous monitoring
   */
  start(intervalMs = 30000) {
    if (this.checkInterval) this.stop()
    this.checkInterval = setInterval(() => this.fullCheck(), intervalMs)
    return this
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    return this
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50) {
    return this.alerts.slice(-limit)
  }

  /**
   * Get history for a time range
   */
  getHistory(startDate, endDate) {
    return this.history.filter(h => {
      const t = new Date(h.timestamp).getTime()
      return t >= startDate && t <= endDate
    })
  }
}

// Singleton instance
let monitorInstance = null

export function getProcessMonitor(config) {
  if (!monitorInstance) {
    monitorInstance = new ProcessMonitor(config)
  }
  return monitorInstance
}
