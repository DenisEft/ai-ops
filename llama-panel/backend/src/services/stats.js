import { spawn } from 'child_process'
import { pipeline } from 'stream/promises'
import { Readable, Writable } from 'stream'

const SUDO_PASS = process.env.SUDO_PASSWORD || ''

// Log line patterns
const LOG_RE = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+\S+\s+llama-server\[(\d+)\]:\s+(.+)$/
const SLOT_DONE_RE = /^slot\s+update_slots:\s+id\s+(\d+)\s+\|\s+task\s+(\d+)\s+\|\s+prompt processing done,\s+n_tokens\s*=\s*(\d+)/
const SLOT_RELEASE_RE = /^slot\s+release:\s+id\s+(\d+)\s+\|\s+task\s+(\d+)\s+\|\s+stop processing:\s+n_tokens\s*=\s*(\d+),\s+truncated\s*=\s*(\d+)/
const SLOT_RELEASE_NOR = /^slot\s+release:\s+id\s+(\d+)\s+\|\s+task\s+(\d+)\s+\|\s+stop processing:\s+n_tokens\s*=\s*(\d+)/
const TIMING_PROMPT_RE = /^prompt eval time\s*=\s*([\d.]+)\s+ms\s+\/\s+(\d+)\s+tokens/
const TIMING_EVAL_RE = /^eval time\s*=\s*([\d.]+)\s+ms\s+\/\s+(\d+)\s+tokens/
const TIMING_TOTAL_RE = /^total time\s*=\s*([\d.]+)\s+ms\s+\/\s+(\d+)\s+tokens/

function journalctlStream(sinceParam, nLines) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let totalSize = 0
    const maxBytes = 20 * 1024 * 1024 // 20MB hard limit

    // echo 'PASS' | sudo -S journalctl ... | grep llama-server | tail -N
    const sudo = spawn('echo', [SUDO_PASS])
    const sudoStdin = sudo.stdin

    const args = ['-S', 'journalctl', '-u', 'llama-8080', '--no-pager']
    if (sinceParam) args.push(sinceParam)
    if (nLines) args.push('-n', String(nLines))
    args.push('--output=short-precise')
    args.push('2>/dev/null')

    // We need to handle 2>/dev/null differently since it's shell syntax
    // Use a shell wrapper instead
    sudoStdin.end()
    sudo.stdout.destroy() // close unused pipe

    // Use shell for proper quoting of since parameter
    // Note: no --grep needed - journalctl -u llama-8080 already filters by service
    let cmd = `echo '${SUDO_PASS}' | sudo -S journalctl -u llama-8080 --no-pager -n ${nLines || 5000} 2>/dev/null`
    if (sinceParam) {
      cmd = `echo '${SUDO_PASS}' | sudo -S journalctl -u llama-8080 --no-pager --since '${sinceParam}' -n ${nLines || 5000} 2>/dev/null`
    }
    
    const sh = spawn('sh', ['-c', cmd])

    sh.stdout.on('data', (chunk) => {
      totalSize += chunk.length
      if (totalSize > maxBytes) {
        sh.kill()
        resolve(Buffer.concat(chunks).toString()) // return what we got
        return
      }
      chunks.push(chunk)
    })
    sh.stderr.on('data', () => {}) // ignore stderr
    sh.on('close', (code) => {
      resolve(Buffer.concat(chunks).toString())
    })
    sh.on('error', reject)
  })
}

export async function getStats({ period = '7d', limit = 100 } = {}) {
  try {
    const days = parseInt(period) || 7
    const sinceParam = `${days} days ago`
    const stdout = await journalctlStream(sinceParam, 3000)

    const requests = parseRequests(stdout)
    const summary = buildSummary(requests)
    const byDay = aggregateByDay(requests)

    return { summary, byDay, requests: requests.slice(0, limit) }
  } catch (err) {
    return { summary: {}, byDay: [], requests: [], error: err.message }
  }
}

function parseRequests(logs) {
  const lines = logs.split('\n')
  const requests = []

  // Track the current request being built for each slot
  // Key: slotId, Value: { timestamp, promptTokens, evalTokens, evalTimeMs, totalTimeMs, totalTokens }
  const current = {}

  for (const line of lines) {
    const logMatch = line.match(LOG_RE)
    if (!logMatch) continue

    const timestamp = logMatch[1]
    const msg = logMatch[3]

    // 1. Prompt processing done — start of a new request for this slot
    const doneMatch = msg.match(SLOT_DONE_RE)
    if (doneMatch) {
      const slotId = doneMatch[1]
      const promptTokens = parseInt(doneMatch[3])
      current[slotId] = {
        slotId,
        timestamp,
        promptTokens,
        evalTokens: 0,
        evalTimeMs: 0,
        totalTimeMs: 0,
        totalTokens: 0,
      }
      continue
    }

    // 2. Timing lines — update the current request for the most recently seen slot
    // Timing lines appear AFTER prompt done, BEFORE slot release
    // They don't have a slot ID, so we match with the most recent slot
    if (TIMING_PROMPT_RE.test(msg) || TIMING_EVAL_RE.test(msg) || TIMING_TOTAL_RE.test(msg)) {
      // Find the most recently used slot (or the only one)
      const slots = Object.keys(current)
      if (slots.length > 0) {
        const slotId = slots[slots.length - 1]
        if (!current[slotId]) continue

        const pm = msg.match(TIMING_PROMPT_RE)
        const em = msg.match(TIMING_EVAL_RE)
        const tm = msg.match(TIMING_TOTAL_RE)

        if (pm) current[slotId].promptTokens = parseInt(pm[2])
        if (em) current[slotId].evalTokens = parseInt(em[2])
        if (tm) current[slotId].totalTokens = parseInt(tm[2])

        // Also capture times
        if (pm) {
          const timeMatch = msg.match(/\d+\.\d+\s+ms/)
          if (timeMatch) current[slotId].promptTimeMs = parseFloat(timeMatch[0])
        }
        if (em) {
          current[slotId].evalTimeMs = parseFloat(msg.match(/([\d.]+)\s+ms/)[1])
        }
        if (tm) {
          current[slotId].totalTimeMs = parseFloat(msg.match(/([\d.]+)\s+ms/)[1])
        }
      }
      continue
    }

    // 3. Slot release — finalize the request
    const releaseMatch = msg.match(SLOT_RELEASE_RE) || msg.match(SLOT_RELEASE_NOR)
    if (releaseMatch) {
      const slotId = releaseMatch[1]
      const nTokens = parseInt(releaseMatch[3])

      if (current[slotId]) {
        // Use timing line totalTokens if available, otherwise use n_tokens from release
        const totalTokens = current[slotId].totalTokens || nTokens
        const promptTokens = current[slotId].promptTokens || 0
        const evalTokens = current[slotId].evalTokens || 0

        // Only add if we have meaningful data
        if (totalTokens > 0 || promptTokens > 0 || evalTokens > 0) {
          requests.push({
            ...current[slotId],
            totalTokens,
            promptTokens,
            evalTokens,
          })
        }
      }

      delete current[slotId]
    }
  }

  // Add any remaining pending requests
  for (const slotId of Object.keys(current)) {
    const req = current[slotId]
    const totalTokens = req.totalTokens || 0
    const promptTokens = req.promptTokens || 0
    const evalTokens = req.evalTokens || 0
    if (totalTokens > 0 || promptTokens > 0 || evalTokens > 0) {
      requests.push({ ...req, totalTokens, promptTokens, evalTokens })
    }
    delete current[slotId]
  }

  return requests
}

function buildSummary(requests) {
  if (!requests.length) return { totalRequests: 0, totalTokens: 0, totalPromptTokens: 0, totalEvalTokens: 0 }

  const totalRequests = requests.length
  const totalTokens = requests.reduce((s, r) => s + (r.totalTokens || 0), 0)
  const totalPromptTokens = requests.reduce((s, r) => s + (r.promptTokens || 0), 0)
  const totalEvalTokens = requests.reduce((s, r) => s + (r.evalTokens || 0), 0)
  const totalTimeMs = requests.reduce((s, r) => s + (r.totalTimeMs || 0), 0)

  const avgTokens = Math.round(totalTokens / totalRequests)
  const avgTimeMs = Math.round(totalTimeMs / totalRequests)

  return {
    totalRequests,
    totalTokens,
    totalPromptTokens,
    totalEvalTokens,
    totalTimeMs,
    totalTimeFormatted: formatMs(totalTimeMs),
    avgTokens,
    avgTimeMs,
    avgTimeFormatted: formatMs(avgTimeMs),
  }
}

function aggregateByDay(requests) {
  if (!requests.length) return []

  const dayMap = {}

  for (const req of requests) {
    const day = getDayKey(req.timestamp)
    if (!day) continue

    if (!dayMap[day]) {
      dayMap[day] = { date: day, requests: 0, tokens: 0, promptTokens: 0, evalTokens: 0, timeMs: 0 }
    }
    dayMap[day].requests++
    dayMap[day].tokens += req.totalTokens || 0
    dayMap[day].promptTokens += req.promptTokens || 0
    dayMap[day].evalTokens += req.evalTokens || 0
    dayMap[day].timeMs += req.totalTimeMs || 0
  }

  return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))
}

function getDayKey(timestamp) {
  if (!timestamp) return null
  const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
  const match = timestamp.match(/^(\w{3})\s+(\d{1,2})\s+\d{2}:\d{2}:\d{2}/)
  if (!match) return null
  const month = months[match[1]]
  const day = String(match[2]).padStart(2, '0')
  return `2026-${month}-${day}`
}

function formatMs(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`
  return `${(ms / 3600000).toFixed(1)}h`
}
