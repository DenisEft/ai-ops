import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = {
  PORT: process.env.PORT || 8081,
  HOST: process.env.HOST || '0.0.0.0',
  LLAMA_URL: process.env.LLAMA_URL || 'http://127.0.0.1:8080',
  SERVICE_NAME: process.env.SERVICE_NAME || 'llama-8080.service',
  SERVICE_FILE: process.env.SERVICE_FILE || '/etc/systemd/system/llama-8080.service',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
}

// Load service file to extract current config
function parseServiceFile() {
  try {
    const content = readFileSync(env.SERVICE_FILE, 'utf-8')
    const match = content.match(/--parallel\s+(\d+)/)
    const threadsMatch = content.match(/-t\s+(\d+)/)
    const ngglMatch = content.match(/-ngl\s+(\d+)/)
    const ctxMatch = content.match(/-c\s+(\d+)/)
    const batchMatch = content.match(/-b\s+(\d+)/)

    return {
      parallel: match ? parseInt(match[1]) : 1,
      threads: threadsMatch ? parseInt(threadsMatch[1]) : 8,
      gpu_layers: ngglMatch ? parseInt(ngglMatch[1]) : 99,
      ctx_len: ctxMatch ? parseInt(ctxMatch[1]) : 100000,
      batch_size: batchMatch ? parseInt(batchMatch[1]) : 8192,
      cacheTypeK: content.includes('cache-type-k f16') ? 'f16' : 'auto',
      cacheTypeV: content.includes('cache-type-v f16') ? 'f16' : 'auto',
      flashAttn: content.includes('--flash-attn on'),
      mlock: content.includes('--mlock'),
    }
  } catch {
    return {
      parallel: 1, threads: 8, gpu_layers: 99,
      ctx_len: 100000, batch_size: 8192,
      cacheTypeK: 'auto', cacheTypeV: 'auto',
      flashAttn: false, mlock: false,
    }
  }
}

export const config = { ...env, service: parseServiceFile() }
