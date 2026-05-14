import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const HISTORY_DIR = join(process.cwd(), 'metrics-history')

/**
 * Metrics History — time-series storage for charts
 * Stores snapshots every 30s, serves aggregated data for different time ranges
 */
class MetricsHistory {
  constructor() {
    this.buffer = []
    this.maxBuffer = 2880 // 24h at 30s intervals
    this.lastSnapshot = null
    this.saveInterval = null

    if (!existsSync(HISTORY_DIR)) {
      mkdirSync(HISTORY_DIR, { recursive: true })
    }

    // Load existing history from disk
    this._loadFromDisk()

    // Start background save
    this.saveInterval = setInterval(() => this._saveToDisk(), 60000)
  }

  _filePath() {
    return join(HISTORY_DIR, 'history.json')
  }

  _loadFromDisk() {
    try {
      const file = this._filePath()
      if (existsSync(file)) {
        const data = JSON.parse(readFileSync(file, 'utf-8'))
        this.buffer = Array.isArray(data) ? data : []
        // Keep last 24h
        const cutoff = Date.now() - 86400000
        this.buffer = this.buffer.filter(e => e.ts >= cutoff)
      }
    } catch (e) {
      console.warn('Failed to load metrics history:', e.message)
    }
  }

  _saveToDisk() {
    try {
      writeFileSync(this._filePath(), JSON.stringify(this.buffer, null, 2))
    } catch (e) {
      console.warn('Failed to save metrics history:', e.message)
    }
  }

  /**
   * Store a metrics snapshot
   */
  store(snapshot) {
    const entry = {
      ts: Date.now(),
      timestamp: new Date().toISOString(),
      cpu: snapshot.cpu ?? null,
      memory: snapshot.memory ?? null,
      gpu: snapshot.gpu ?? null,
      gpuTemp: snapshot.gpuTemp ?? null,
      vramUsed: snapshot.vramUsed ?? null,
      vramTotal: snapshot.vramTotal ?? null,
      tokensPerSec: snapshot.tokensPerSec ?? null,
      tokensTotal: snapshot.tokensTotal ?? null,
      llamaTps: snapshot.llamaTps ?? null,
      llamaDecoded: snapshot.llamaDecoded ?? null,
    }

    this.buffer.push(entry)

    // Keep last 24h
    const cutoff = Date.now() - 86400000
    this.buffer = this.buffer.filter(e => e.ts >= cutoff)

    // Trim buffer
    if (this.buffer.length > this.maxBuffer) {
      this.buffer = this.buffer.slice(-this.maxBuffer)
    }

    this.lastSnapshot = entry
    return entry
  }

  /**
   * Get aggregated data for a metric over a time range
   * Aggregation: takes every Nth point to keep response small
   */
  getHistory(metric, range) {
    const ranges = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000,
    }

    const ms = ranges[range] || 86400000
    const now = Date.now()
    const start = now - ms

    // Filter by time range
    const filtered = this.buffer.filter(e => e.ts >= start)

    // Determine aggregation step
    const maxPoints = 200
    const step = Math.max(1, Math.floor(filtered.length / maxPoints))

    // Aggregate
    const points = []
    for (let i = 0; i < filtered.length; i += step) {
      const chunk = filtered.slice(i, i + step)
      const avg = chunk.reduce((s, e) => s + (e[metric] ?? 0), 0) / chunk.length
      points.push({
        time: chunk[0].timestamp,
        ts: chunk[0].ts,
        value: Math.round(avg * 100) / 100,
      })
    }

    return points
  }

  /**
   * Get latest snapshot
   */
  latest() {
    return this.lastSnapshot
  }

  /**
   * Get all metrics for latest snapshot (for overview)
   */
  latestAll() {
    return this.lastSnapshot
  }

  stop() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }
    this._saveToDisk()
  }
}

let instance = null
export function getMetricsHistory() {
  if (!instance) {
    instance = new MetricsHistory()
  }
  return instance
}
