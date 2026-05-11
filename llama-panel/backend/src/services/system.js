import si from 'systeminformation'
import { execSync, exec } from 'child_process'
import { promisify } from 'util'

async function getCpuUsage() {
  try {
    const execAsync = promisify(exec)

    const lines1 = execSync('cat /proc/stat | grep ^cpu ').toString().trim().split(/\s+/)
    const [_, u1, n1, s1, id1, w1, q1, sq1, st1] = lines1
    const t1 = parseInt(u1) + parseInt(n1) + parseInt(s1) + parseInt(id1) + parseInt(w1) + parseInt(q1) + parseInt(sq1) + parseInt(st1)
    const idle1 = parseInt(id1) + parseInt(w1)

    await execAsync('sleep 1')
    const lines2 = execSync('cat /proc/stat | grep ^cpu ').toString().trim().split(/\s+/)
    const [__, u2, n2, s2, id2, w2, q2, sq2, st2] = lines2
    const t2 = parseInt(u2) + parseInt(n2) + parseInt(s2) + parseInt(id2) + parseInt(w2) + parseInt(q2) + parseInt(sq2) + parseInt(st2)
    const idle2 = parseInt(id2) + parseInt(w2)

    const td = t2 - t1
    const id = idle2 - idle1
    return td > 0 ? Math.round(((td - id) / td) * 100) : 0
  } catch (e) {
    console.warn('CPU usage from /proc/stat failed:', e?.message || String(e))
    return 0
  }
}

function parseNvidiaSmi() {
  try {
    const out = execSync('nvidia-smi --query-gpu=memory.total,memory.used,temperature.gpu,power.draw --format=csv,noheader').toString().trim()
    const [memTotal, memUsed, temp, power] = out.split(',').map(s => s.trim())
    return {
      memoryTotal: parseInt(memTotal) || 0,
      memoryUsed: parseInt(memUsed) || 0,
      temperature: parseInt(temp) || 0,
      powerDraw: parseFloat(power) || 0,
    }
  } catch {
    return null
  }
}

export async function getGpuMetrics() {
  try {
    const controllers = await si.graphics()
    const gpus = controllers.controllers || []
    if (gpus.length === 0) return { name: 'No GPU detected', memoryUsed: 0, memoryTotal: 0, temperature: 0, powerDraw: 0, memoryPercent: 0 }

    const gpu = gpus[0]

    // Try nvidia-smi first for accurate memory/power data
    const nv = parseNvidiaSmi()

    const memoryTotal = nv?.memoryTotal || Math.round((gpu.memoryTotal || 0) / 1024 / 1024)
    const memoryUsed = nv?.memoryUsed || Math.round((gpu.memoryTotal - (gpu.memoryUsed || 0)) / 1024 / 1024) || 0

    return {
      name: gpu.model || nv?.memoryTotal ? 'NVIDIA GPU' : 'Unknown GPU',
      memoryUsed,
      memoryTotal,
      temperature: nv?.temperature || gpu.temperatureGpu || 0,
      powerDraw: nv?.powerDraw || gpu.powerDraw || 0,
      memoryPercent: memoryTotal > 0 ? Math.round((memoryUsed / memoryTotal) * 100) : 0,
    }
  } catch (err) {
    console.error('GPU metrics error:', err.message)
    return { name: 'N/A', memoryUsed: 0, memoryTotal: 0, temperature: 0, powerDraw: 0, memoryPercent: 0 }
  }
}

export async function getSystemMetrics() {
  const [cpu, mem, _load, fs] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.currentLoad(),
    si.fsSize(),
  ])

  // CPU usage from /proc/stat (reliable fallback)
  const cpuUsage = await getCpuUsage()

  // Read CPU temperature from sysfs
  let temperature = 0
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    try {
      const { stdout } = await execAsync('cat /sys/devices/platform/coretemp.*/hwmon/hwmon*/temp*_input 2>/dev/null | head -1')
      if (stdout.trim()) {
        temperature = Math.round(parseInt(stdout.trim()) / 1000)
      }
    } catch (e) {
      try {
        const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1')
        if (stdout.trim()) {
          temperature = Math.round(parseInt(stdout.trim()) / 1000)
        }
      } catch (e2) {
        // No temperature sensors
      }
    }
  } catch (e) {
    // Silent fail
  }

  // Find root filesystem - si.fsSize returns device paths in 'fs', mount points in 'mount'
  const rootFs = fs.find(f => f.mount === '/') || fs.find(f => f.fs === '/') || fs[0]

  // Memory percent
  const memPercent = mem.total > 0 ? Math.round((mem.active / mem.total) * 100) : 0

  return {
    cpu: {
      brand: cpu.brand,
      manufacturer: cpu.manufacturer,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speedMin: cpu.speedMin,
      speedMax: cpu.speedMax,
      speedCurrent: cpu.speedCurrent,
      usage: cpuUsage,
      temperature,
    },
    memory: {
      total: mem.total,
      available: mem.available,
      used: mem.active,
      percent: memPercent,
    },
    load: {
      load1: _load?.loadLoad1 || null,
      load5: _load?.loadLoad5 || null,
      load15: _load?.loadLoad15 || null,
      cpuUsage: _load?.cpuUsage || cpuUsage,
    },
    filesystem: {
      total: rootFs?.size || 0,
      used: rootFs?.used || 0,
      available: rootFs?.avail || 0,
      percent: rootFs?.use || 0,
    },
  }
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  if (!isFinite(bytes)) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
