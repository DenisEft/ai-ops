import { readFileSync, writeFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const SERVICE_FILE = '/etc/systemd/system/llama-8080.service'

function parseServiceFile() {
  const content = readFileSync(SERVICE_FILE, 'utf-8')
  const lines = content.split('\n')

  const config = {
    parallel: 1,
    threads: 8,
    gpu_layers: 99,
    ctx_len: 100000,
    batch_size: 8192,
    cacheTypeK: 'f16',
    cacheTypeV: 'f16',
    flashAttn: true,
    mlock: true,
  }

  let inExecStart = false
  let execPart = ''

  for (const line of lines) {
    if (line.includes('ExecStart')) {
      inExecStart = true
      execPart = line
      continue
    }
    if (inExecStart) {
      execPart += line.trim()
      if (!line.endsWith('\\')) {
        inExecStart = false
        break
      }
    }
  }

  const parallelMatch = execPart.match(/--parallel\s+(\d+)/)
  const threadsMatch = execPart.match(/-t\s+(\d+)/)
  const ngglMatch = execPart.match(/-ngl\s+(\d+)/)
  const ctxMatch = execPart.match(/-c\s+(\d+)/)
  const batchMatch = execPart.match(/-b\s+(\d+)/)
  const cacheKMatch = execPart.match(/--cache-type-k\s+(\S+)/)
  const cacheVMatch = execPart.match(/--cache-type-v\s+(\S+)/)
  const flashMatch = execPart.match(/--flash-attn\s+(\S+)/)
  const mlockMatch = execPart.match(/--mlock/)

  if (parallelMatch) config.parallel = parseInt(parallelMatch[1])
  if (threadsMatch) config.threads = parseInt(threadsMatch[1])
  if (ngglMatch) config.gpu_layers = parseInt(ngglMatch[1])
  if (ctxMatch) config.ctx_len = parseInt(ctxMatch[1])
  if (batchMatch) config.batch_size = parseInt(batchMatch[1])
  if (cacheKMatch) config.cacheTypeK = cacheKMatch[1]
  if (cacheVMatch) config.cacheTypeV = cacheVMatch[1]
  if (flashMatch) config.flashAttn = flashMatch[1] === 'on'
  if (mlockMatch) config.mlock = true

  return config
}

function buildExecStart(config) {
  const base = '/home/den/llama.cpp/build/bin/llama-server'
  const flags = [
    `-m /mnt/models/Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf`,
    `--host 127.0.0.1 --port 8080`,
    `-ngl ${config.gpu_layers}`,
    `-t ${config.threads}`,
    `-c ${config.ctx_len}`,
    `-b ${config.batch_size}`,
    `--cache-type-k ${config.cacheTypeK}`,
    `--cache-type-v ${config.cacheTypeV}`,
    `--flash-attn ${config.flashAttn ? 'on' : 'off'}`,
    `--parallel ${config.parallel}`,
    `--mlock`,
  ]
  return `${base} ${flags.join(' \\')}`
}

function rebuildServiceFile(config) {
  const content = readFileSync(SERVICE_FILE, 'utf-8')
  const execStart = buildExecStart(config)

  // Replace ExecStart block
  let newContent = content.replace(
    /ExecStart=.*$/s,
    `ExecStart=${execStart}`
  )

  writeFileSync(SERVICE_FILE, newContent)
}

export async function updateConfig(changes) {
  const current = parseServiceFile()
  const updated = { ...current, ...changes }

  // Validate
  if (updated.parallel < 1 || updated.parallel > 8) {
    throw new Error('parallel must be 1-8')
  }
  if (updated.threads < 1 || updated.threads > 24) {
    throw new Error('threads must be 1-24')
  }
  if (updated.gpu_layers < 0 || updated.gpu_layers > 100) {
    throw new Error('gpu_layers must be 0-100')
  }
  if (updated.ctx_len < 2048 || updated.ctx_len > 1000000) {
    throw new Error('ctx_len must be 2048-1000000')
  }
  if (updated.batch_size < 128 || updated.batch_size > 65536) {
    throw new Error('batch_size must be 128-65536')
  }

  rebuildServiceFile(updated)

  return { success: true, message: 'Config updated. Restart service to apply.', config: updated }
}

export async function getConfig() {
  return parseServiceFile()
}

export async function getServiceStatus() {
  const services = {}
  
  // Check llama-8080 service
  try {
    const { stdout } = await execAsync('systemctl --user is-active llama-8080.service 2>&1', { timeout: 3000 })
    services['llama-8080'] = {
      active: stdout.trim() === 'active',
      name: 'llama-8080.service',
      type: 'llama',
    }
  } catch {
    services['llama-8080'] = { active: false, name: 'llama-8080.service', type: 'llama' }
  }
  
  // Check llama-panel service (systemd + fallback to process check)
  let panelActive = false
  try {
    const { stdout } = await execAsync('systemctl --user is-active llama-panel.service 2>&1', { timeout: 3000 })
    panelActive = stdout.trim() === 'active'
  } catch {}
  
  // Fallback: check if panel process is running
  if (!panelActive) {
    try {
      const { stdout } = await execAsync('pgrep -f "node src/index.js" | head -1', { timeout: 3000 })
      if (stdout.trim()) panelActive = true
    } catch {}
  }
  
  services['llama-panel'] = {
    active: panelActive,
    name: 'llama-panel.service',
    type: 'panel',
  }
  
  return services
}
