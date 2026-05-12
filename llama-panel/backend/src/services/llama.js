import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function parsePrometheusMetrics(text) {
  const result = {}
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue
    const parts = line.split(' ')
    if (parts.length >= 2) {
      const name = parts[0]
      const value = parseFloat(parts[parts.length - 1])
      if (!isNaN(value)) {
        result[name] = value
      }
    }
  }
  return result
}

export async function getLlamaStatus() {
  try {
    const health = await axios.get('/health', {
      baseURL: process.env.LLAMA_URL || 'http://127.0.0.1:8080',
      timeout: 5000,
    })

    const props = await axios.get('/props', {
      baseURL: process.env.LLAMA_URL || 'http://127.0.0.1:8080',
      timeout: 5000,
    })

    let metricsData = null
    let metricsError = null
    try {
      const metricsRes = await axios.get('/metrics', {
        baseURL: process.env.LLAMA_URL || 'http://127.0.0.1:8080',
        timeout: 5000,
      })
      metricsData = parsePrometheusMetrics(metricsRes.data)
    } catch (e) {
      if (e.response?.status === 501) {
        metricsError = 'Metrics not enabled (need --metrics flag)'
      } else {
        metricsError = e.message
      }
    }

    return {
      status: 'running',
      health: health.data,
      props: props.data,
      metrics: metricsData,
      metricsError,
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return { status: 'offline', error: 'llama-server not reachable' }
    }
    return { status: 'error', error: err.message }
  }
}

export async function getSystemdServiceStatus(serviceName) {
  try {
    const { stdout } = await execAsync(
      `echo '${process.env.SUDO_PASSWORD || ''}' | sudo -S systemctl is-active ${serviceName} 2>/dev/null`
    )
    const { stdout: statusOut } = await execAsync(
      `echo '${process.env.SUDO_PASSWORD || ''}' | sudo -S systemctl show ${serviceName} --property=ActiveState,SubState,MainPID,LoadState --value 2>/dev/null`
    )

    return {
      active: stdout.trim() === 'active',
      state: statusOut.trim(),
    }
  } catch {
    return { active: false, state: 'unknown' }
  }
}

export async function controlService(action, serviceName) {
  try {
    await execAsync(`echo '${process.env.SUDO_PASSWORD || ''}' | sudo -S systemctl ${action} ${serviceName}`)
    return { success: true, action, status: 'ok' }
  } catch (err) {
    return { success: false, action, error: err.message }
  }
}

// GPU metrics moved to system.js (single source of truth)
// This file only handles llama-server interaction
export { getGpuMetrics } from './system.js'
