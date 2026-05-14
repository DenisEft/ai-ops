import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const AUDIT_DIR = join(process.cwd(), 'audit')
const MAX_LOG_SIZE = 10000 // entries before rotation

/**
 * Audit Log — логирование всех действий
 */
export class AuditLogger {
  constructor() {
    if (!existsSync(AUDIT_DIR)) {
      mkdirSync(AUDIT_DIR, { recursive: true })
    }
  }

  /**
   * Log an audit entry
   */
  log({ action, resource, userId, ip, details = {}, success = true }) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      action,
      resource,
      userId: userId || 'system',
      ip: ip || 'local',
      success,
      details
    }

    const file = join(AUDIT_DIR, 'audit.log')
    const line = JSON.stringify(entry) + '\n'

    // Append to log
    try {
      writeFileSync(file, line, { flag: 'a' })

      // Rotate if too large
      this._rotate(file)
    } catch (err) {
      console.error('[audit] Write failed:', err.message)
    }

    return entry
  }

  /**
   * Rotate log if too large
   */
  _rotate(file) {
    if (!existsSync(file)) return

    try {
      const content = readFileSync(file, 'utf-8')
      const lines = content.trim().split('\n')

      if (lines.length > MAX_LOG_SIZE) {
        // Keep last MAX_LOG_SIZE entries
        const rotated = lines.slice(-MAX_LOG_SIZE).join('\n') + '\n'
        const rotatedFile = file.replace('.log', '.rotated')
        writeFileSync(rotatedFile, rotated)
      }
    } catch {
      // Ignore rotation errors
    }
  }

  /**
   * Get audit entries
   */
  getEntries(options = {}) {
    const { limit = 100, action, resource, userId } = options
    const file = join(AUDIT_DIR, 'audit.log')

    if (!existsSync(file)) return []

    try {
      const content = readFileSync(file, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      let entries = lines.map(line => {
        try { return JSON.parse(line) } catch { return null }
      }).filter(Boolean)

      // Filter
      if (action) entries = entries.filter(e => e.action === action)
      if (resource) entries = entries.filter(e => e.resource === resource)
      if (userId) entries = entries.filter(e => e.userId === userId)

      // Sort by timestamp desc, limit
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      return entries.slice(0, limit)
    } catch {
      return []
    }
  }

  /**
   * Clear audit log
   */
  clear() {
    const file = join(AUDIT_DIR, 'audit.log')
    if (existsSync(file)) {
      writeFileSync(file, '')
    }
    return true
  }
}

// Singleton
let auditInstance = null

export function getAuditLogger() {
  if (!auditInstance) {
    auditInstance = new AuditLogger()
  }
  return auditInstance
}
