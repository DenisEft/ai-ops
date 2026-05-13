import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const METRICS_CONFIG_FILE = path.join(__dirname, '../../metrics-config.json')

// Default metrics that are always available
const DEFAULT_METRICS = [
  {
    id: 'cpu',
    name: 'CPU Usage',
    nameRu: 'Загрузка CPU',
    type: 'gauge',
    enabled: true,
    unit: '%',
    max: 100,
    color: '#3b82f6',
    collect: {
      method: 'procstat',
      interval: 5000
    }
  },
  {
    id: 'memory',
    name: 'Memory Usage',
    nameRu: 'Использование памяти',
    type: 'gauge',
    enabled: true,
    unit: '%',
    max: 100,
    color: '#10b981',
    collect: {
      method: 'systeminfo',
      field: 'memory.percent',
      interval: 5000
    }
  },
  {
    id: 'gpu',
    name: 'GPU Usage',
    nameRu: 'Загрузка GPU',
    type: 'gauge',
    enabled: true,
    unit: '%',
    max: 100,
    color: '#8b5cf6',
    collect: {
      method: 'nvidia-smi',
      field: 'memoryPercent',
      interval: 5000
    }
  },
  {
    id: 'gpu-temp',
    name: 'GPU Temperature',
    nameRu: 'Температура GPU',
    type: 'gauge',
    enabled: true,
    unit: '°C',
    max: 100,
    color: '#ef4444',
    collect: {
      method: 'nvidia-smi',
      field: 'temperature',
      interval: 5000
    }
  },
  {
    id: 'gpu-power',
    name: 'GPU Power',
    nameRu: 'Потребление GPU',
    type: 'gauge',
    enabled: false,
    unit: 'W',
    max: 350,
    color: '#f59e0b',
    collect: {
      method: 'nvidia-smi',
      field: 'powerDraw',
      interval: 5000
    }
  },
  {
    id: 'tokens',
    name: 'Total Tokens',
    nameRu: 'Всего токенов',
    type: 'chart',
    enabled: true,
    unit: '',
    color: '#06b6d4',
    collect: {
      method: 'prometheus',
      field: 'tokens.total',
      interval: 10000
    }
  },
  {
    id: 'requests',
    name: 'Requests',
    nameRu: 'Запросов',
    type: 'chart',
    enabled: true,
    unit: '',
    color: '#8b5cf6',
    collect: {
      method: 'prometheus',
      field: 'requests',
      interval: 10000
    }
  },
  {
    id: 'tokens-per-sec',
    name: 'Tokens/sec',
    nameRu: 'Токенов/сек',
    type: 'chart',
    enabled: true,
    unit: 'tok/s',
    max: 200,
    color: '#10b981',
    collect: {
      method: 'prometheus',
      field: 'tokensPerSec',
      interval: 10000
    }
  },
  {
    id: 'temperature',
    name: 'CPU Temperature',
    nameRu: 'Температура CPU',
    type: 'gauge',
    enabled: false,
    unit: '°C',
    max: 100,
    color: '#ef4444',
    collect: {
      method: 'thermal',
      interval: 5000
    }
  },
  {
    id: 'disk',
    name: 'Disk Usage',
    nameRu: 'Использование диска',
    type: 'gauge',
    enabled: false,
    unit: '%',
    max: 100,
    color: '#f59e0b',
    collect: {
      method: 'filesystem',
      interval: 30000
    }
  },
  {
    id: 'load',
    name: 'Load Average',
    nameRu: 'Средняя нагрузка',
    type: 'chart',
    enabled: false,
    unit: '',
    color: '#06b6d4',
    collect: {
      method: 'systeminfo',
      field: 'load',
      interval: 5000
    }
  }
]

export async function loadMetricsConfig() {
  try {
    if (fs.existsSync(METRICS_CONFIG_FILE)) {
      const raw = fs.readFileSync(METRICS_CONFIG_FILE, 'utf8')
      const config = JSON.parse(raw)
      // Merge with defaults - keep user customizations
      const defaultMap = new Map(DEFAULT_METRICS.map(m => [m.id, m]))
      const userMap = new Map((config.metrics || []).map(m => [m.id, m]))
      
      // User metrics override defaults, but keep all defaults
      const merged = new Map([...defaultMap, ...userMap])
      return Array.from(merged.values())
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load metrics config:', err.message)
  }
  return DEFAULT_METRICS
}

export async function saveMetricsConfig(metrics) {
  const config = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    metrics: metrics
  }
  fs.writeFileSync(METRICS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
}

export async function addCustomMetric(metric) {
  const metrics = await loadMetricsConfig()
  
  // Check for duplicate ID
  if (metrics.find(m => m.id === metric.id)) {
    throw new Error(`Метрика с ID "${metric.id}" уже существует`)
  }
  
  // Ensure required fields
  const newMetric = {
    id: metric.id,
    name: metric.name || metric.nameRu || 'Custom Metric',
    nameRu: metric.nameRu || metric.name || 'Пользовательская метрика',
    type: metric.type || 'gauge',
    enabled: metric.enabled ?? true,
    unit: metric.unit || '',
    max: metric.max || 100,
    color: metric.color || '#06b6d4',
    collect: {
      method: metric.collect?.method || 'command',
      command: metric.collect?.command || '',
      regex: metric.collect?.regex || null,
      field: metric.collect?.field || null,
      interval: metric.collect?.interval || 5000
    },
    custom: true,
    description: metric.description || ''
  }
  
  metrics.push(newMetric)
  await saveMetricsConfig(metrics)
  return newMetric
}

export async function removeMetric(id) {
  const metrics = await loadMetricsConfig()
  const filtered = metrics.filter(m => m.id !== id)
  if (filtered.length === metrics.length) {
    throw new Error(`Метрика с ID "${id}" не найдена`)
  }
  await saveMetricsConfig(filtered)
  return { success: true, id }
}

export async function toggleMetric(id) {
  const metrics = await loadMetricsConfig()
  const metric = metrics.find(m => m.id === id)
  if (!metric) {
    throw new Error(`Метрика с ID "${id}" не найдена`)
  }
  metric.enabled = !metric.enabled
  await saveMetricsConfig(metrics)
  return { id, enabled: metric.enabled }
}

export async function updateMetric(id, updates) {
  const metrics = await loadMetricsConfig()
  const metric = metrics.find(m => m.id === id)
  if (!metric) {
    throw new Error(`Метрика с ID "${id}" не найдена`)
  }
  
  // Update allowed fields
  Object.assign(metric, {
    name: updates.name ?? metric.name,
    nameRu: updates.nameRu ?? metric.nameRu,
    type: updates.type ?? metric.type,
    unit: updates.unit ?? metric.unit,
    max: updates.max ?? metric.max,
    color: updates.color ?? metric.color,
    description: updates.description ?? metric.description,
    'collect.command': updates.collect?.command ?? metric.collect?.command,
    'collect.regex': updates.collect?.regex ?? metric.collect?.regex,
    'collect.interval': updates.collect?.interval ?? metric.collect?.interval
  })
  
  // Handle nested collect object properly
  if (updates.collect) {
    Object.assign(metric.collect, updates.collect)
  }
  
  await saveMetricsConfig(metrics)
  return metric
}

// Collect data for a specific metric
export async function collectMetricData(metric) {
  try {
    let value = null
    // eslint-disable-next-line no-unused-vars
    const label = ''
    
    switch (metric.collect.method) {
      case 'procstat':
        value = await collectCpuUsage()
        break
      case 'systeminfo':
        value = await collectSystemInfo(metric.collect.field)
        break
      case 'nvidia-smi':
        value = await collectNvidiaSmi(metric.collect.field)
        break
      case 'prometheus':
        value = await collectPrometheus(metric.collect.field)
        break
      case 'thermal':
        value = await collectTemperature()
        break
      case 'filesystem':
        value = await collectDiskUsage()
        break
      case 'command':
        value = await collectCommand(metric.collect.command, metric.collect.regex)
        break
      default:
        throw new Error(`Unknown collection method: ${metric.collect.method}`)
    }
    
    return {
      id: metric.id,
      name: metric.nameRu || metric.name,
      value,
      unit: metric.unit,
      timestamp: new Date().toISOString()
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to collect metric ${metric.id}:`, err.message)
    return {
      id: metric.id,
      name: metric.nameRu || metric.name,
      value: null,
      unit: metric.unit,
      error: err.message,
      timestamp: new Date().toISOString()
    }
  }
}

// Collection methods
async function collectCpuUsage() {
  try {
    const { exec, execSync } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const lines1 = execSync('cat /proc/stat | grep ^cpu ').toString().trim().split(/\s+/)
    const [_, u1, n1, s1, id1] = lines1
    const t1 = parseInt(u1) + parseInt(n1) + parseInt(s1) + parseInt(id1)
    const idle1 = parseInt(id1)
    
    await execAsync('sleep 1')
    const lines2 = execSync('cat /proc/stat | grep ^cpu ').toString().trim().split(/\s+/)
    const [__, u2, n2, s2, id2] = lines2
    const t2 = parseInt(u2) + parseInt(n2) + parseInt(s2) + parseInt(id2)
    const idle2 = parseInt(id2)
    
    const td = t2 - t1
    const id = idle2 - idle1
    return td > 0 ? Math.round(((td - id) / td) * 100) : 0
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('CPU usage from /proc/stat failed:', err.message)
    return 0
  }
}

async function collectSystemInfo(field) {
  try {
    const si = await import('systeminformation')
    
    if (field === 'memory.percent') {
      const mem = await si.mem()
      return Math.round((mem.active / mem.total) * 100)
    }
    if (field === 'load') {
      const load = await si.currentLoad()
      return load.loadAverage1
    }
    return null
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('systeminfo collection failed:', err.message)
    return null
  }
}

async function collectNvidiaSmi(field) {
  try {
    const output = await execAsync('nvidia-smi --query-gpu=memory.used,memory.total,name,temperature.gpu,power.draw --format=csv,noheader')
    const line = output.stdout.trim().split('\n')[0]
    if (!line) return null
    
    const [memUsed, memTotal, name, temp, power] = line.split(',')
    const memUsedInt = parseInt(memUsed)
    const memTotalInt = parseInt(memTotal)
    
    const data = {
      name: name.trim(),
      memoryUsed: memUsedInt,
      memoryTotal: memTotalInt,
      temperature: parseInt(temp),
      powerDraw: parseFloat(power),
      memoryPercent: memTotalInt > 0 ? Math.round((memUsedInt / memTotalInt) * 100) : 0
    }
    
    if (field && data[field] !== undefined) {
      return data[field]
    }
    return data
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('nvidia-smi collection failed:', err.message)
    return null
  }
}

async function collectPrometheus(field) {
  try {
    const axios = await import('axios')
    const res = await axios.default.get('http://127.0.0.1:8080/metrics', { timeout: 5000 })
    
    const metrics = {}
    res.data.split('\n').forEach(line => {
      if (line.startsWith('#') || !line.trim()) return
      const parts = line.split(' ')
      if (parts.length >= 2) {
        const name = parts[0]
        const value = parseFloat(parts[parts.length - 1])
        if (!isNaN(value)) {
          metrics[name] = value
        }
      }
    })
    
    if (field === 'tokens.total') {
      return (metrics['llamacpp:prompt_tokens_total'] || 0) + (metrics['llamacpp:tokens_predicted_total'] || 0)
    }
    if (field === 'requests') {
      return metrics['llamacpp:n_decode_total'] || 0
    }
    if (field === 'tokensPerSec') {
      return metrics['llamacpp:predicted_tokens_seconds'] || 0
    }
    
    return metrics[field] || null
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('prometheus collection failed:', err.message)
    return null
  }
}

async function collectTemperature() {
  try {
    const { execSync } = await import('child_process')

    // Try /sys/class/thermal first
    let output
    try { output = execSync('cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1').toString().trim() }
    catch { /* ignore */ }
    if (output) {
      return Math.round(parseFloat(output) / 1000)
    }

    // Try /sys/devices/platform/coretemp.*
    try { output = execSync('cat /sys/devices/platform/coretemp.*/hwmon/hwmon*/temp1_input 2>/dev/null | head -1').toString().trim() }
    catch { /* ignore */ }
    if (output) {
      return Math.round(parseFloat(output) / 1000)
    }

    return null
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('temperature collection failed:', err.message)
    return null
  }
}

async function collectDiskUsage() {
  try {
    const si = await import('systeminformation')
    const fs = await si.fileSystemSize()
    if (!fs || fs.length === 0) return 0
    
    // Find root filesystem usage
    const root = fs.find(f => f.fs === '/')
    if (root) {
      return Math.round((root.use / 100) * 100)
    }
    
    // Return max usage
    return Math.max(...fs.map(f => Math.round((f.use / 100) * 100)))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('disk usage collection failed:', err.message)
    return null
  }
}

async function collectCommand(command, regex) {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const output = await execAsync(command)
    const stdout = output.stdout.trim()
    
    if (regex) {
      const match = stdout.match(new RegExp(regex))
      if (match && match[1]) {
        return parseFloat(match[1])
      }
      return null
    }
    
    return parseFloat(stdout)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Command collection failed: ${err.message}`)
    return null
  }
}

// Get all enabled metrics for a given type
export function getEnabledMetrics(_type) { // eslint-disable-line no-unused-vars
  // Will be called after load
  return null
}
