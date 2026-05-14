import * as systemService from './system.js'
import * as llamaService from './llama.js'
import * as configService from './config.js'
import * as openclawService from './openclaw.js'

const THRESHOLDS = {
  cpu:   { warning: 80, critical: 95 },
  ram:   { warning: 85, critical: 95 },
  vram:  { warning: 85, critical: 95 },
  temp:  { warning: 70, critical: 85 },
  disk:  { warning: 85, critical: 95 },
}

function statusColor(value, metric) {
  const t = THRESHOLDS[metric]
  if (!t) return 'ok'
  if (value >= t.critical) return 'critical'
  if (value >= t.warning) return 'warning'
  return 'ok'
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  if (!isFinite(bytes)) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export async function getDashboardOverview() {
  // Aggregate all data with fallbacks
  const [systemData, gpuData, llamaData, servicesData, openclawData] = await Promise.allSettled([
    systemService.getSystemMetrics(),
    systemService.getGpuMetrics(),
    llamaService.getLlamaStatus(),
    configService.getServiceStatus(),
    openclawService.getStatus(),
  ])

  const system = systemData.status === 'fulfilled' ? systemData.value : null
  const gpu = gpuData.status === 'fulfilled' ? gpuData.value : null
  const llama = llamaData.status === 'fulfilled' ? llamaData.value : null
  const services = servicesData.status === 'fulfilled' ? servicesData.value : null
  const openclaw = openclawData.status === 'fulfilled' ? openclawData.value : null

  // Status
  const wsStatus = system ? 'connected' : 'disconnected'
  const llamaStatus = llama?.status === 'running' ? 'ok' : (llama?.status === 'offline' ? 'offline' : 'error')
  const openclawStatus = openclaw?.active === 'active' ? 'ok' : (openclaw?.active === 'unknown' ? 'unknown' : 'error')
  const panelService = services?.['llama-panel'] || services?.llama_panel || null
  const panelStatus = panelService?.active ? 'ok' : 'error'

  // Tokens from Llama metrics
  const llamaTokens = (llama?.metrics?.['llamacpp:tokens_predicted_total'] || 0) + (llama?.metrics?.['llamacpp:prompt_tokens_total'] || 0)
  // OpenClaw tokens from gateway metrics
  const openclawTokens = openclaw?.metrics?.['openclaw:tokens_total'] || 0

  // Gauge data
  const cpuUsage = system?.cpu?.usage || 0
  const ramPercent = system?.memory?.percent || 0
  const vramUsed = gpu?.memoryUsed || 0
  const vramTotal = gpu?.memoryTotal || 1
  const vramPercent = vramTotal > 0 ? Math.round((vramUsed / vramTotal) * 100) : 0
  const temp = gpu?.temperature || 0
  const llmTps = llama?.tokens_per_second || 0
  const llmQueue = llama?.queue_size || 0
  const llmDecoded = llama?.metrics?.llama_tokens_decoded || 0

  // Health check
  const health = [
    { service: 'Llama Server', status: llamaStatus, detail: llamaStatus === 'ok' ? `${llmTps.toFixed(1)} t/s` : (llama?.error || '') },
    { service: 'OpenClaw', status: openclawStatus, detail: openclawStatus === 'ok' ? 'active' : (openclaw?.active || '') },
    { service: 'Panel', status: panelStatus, detail: panelStatus === 'ok' ? 'running' : '' },
    { service: 'GPU Temp', status: statusColor(temp, 'temp'), detail: `${temp}°C` },
    { service: 'VRAM', status: statusColor(vramPercent, 'vram'), detail: `${vramUsed}/${vramTotal} MB` },
    { service: 'RAM', status: statusColor(ramPercent, 'ram'), detail: `${ramPercent}%` },
    { service: 'CPU', status: statusColor(cpuUsage, 'cpu'), detail: `${cpuUsage}%` },
  ]

  // Alerts
  const alerts = []
  if (statusColor(temp, 'temp') !== 'ok') {
    alerts.push({
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      level: statusColor(temp, 'temp') === 'critical' ? 'critical' : 'warning',
      message: `GPU temp ${temp}°C`,
    })
  }
  if (statusColor(vramPercent, 'vram') !== 'ok') {
    alerts.push({
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      level: statusColor(vramPercent, 'vram') === 'critical' ? 'critical' : 'warning',
      message: `VRAM ${vramPercent}%`,
    })
  }
  if (llamaStatus !== 'ok') {
    alerts.push({
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      level: 'critical',
      message: `Llama server: ${llamaStatus}`,
    })
  }
  if (openclawStatus !== 'ok') {
    alerts.push({
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      level: 'warning',
      message: `OpenClaw: ${openclawStatus}`,
    })
  }

  return {
    timestamp: new Date().toISOString(),
    status: {
      websocket: wsStatus,
      llama: llamaStatus,
      openclaw: openclawStatus,
      panel: panelStatus,
    },
    gauge: {
      cpu: { usage: cpuUsage, cores: system?.cpu?.cores || 0, temp: system?.cpu?.temperature || 0 },
      memory: {
        usedPercent: ramPercent,
        total: formatBytes(system?.memory?.total || 0),
        used: formatBytes(system?.memory?.used || 0),
        available: formatBytes(system?.memory?.available || 0),
      },
      gpu: {
        temp,
        load: gpu?.memoryPercent || 0,
        vramUsed,
        vramTotal,
        powerDraw: gpu?.powerDraw || 0,
      },
      llm: {
        tokensPerSecond: llmTps,
        queueSize: llmQueue,
        decoded: llmDecoded,
      },
    },
    health,
    alerts: alerts.slice(-10),
    tokens: {
      llama: Math.round(llamaTokens),
      openclaw: Math.round(openclawTokens),
    },
  }
}

export function getThresholds() {
  return THRESHOLDS
}
