import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const CERTS_DIR = join(process.cwd(), 'certs')

/**
 * HTTPS Self-Signed Certificate Manager
 * - Генерация self-signed сертификатов
 * - Автоматическая проверка срока действия
 * - Перегенерация при истечении
 */
export class HttpsManager {
  constructor(config = {}) {
    this.certPath = join(CERTS_DIR, 'server.crt')
    this.keyPath = join(CERTS_DIR, 'server.key')
    this.validityDays = config.validityDays || 365
    this.country = config.country || 'RU'
    this.state = config.state || 'Primorsky'
    this.city = config.city || 'Vladivostok'
    this.org = config.org || 'LlamaPanel'
    this.checkInterval = null
  }

  /**
   * Check if certificates exist and are valid
   */
  checkCerts() {
    if (!existsSync(this.certPath) || !existsSync(this.keyPath)) {
      return { exists: false }
    }

    try {
      // Check expiry using openssl
      const expiry = execSync(
        `openssl x509 -in ${this.certPath} -noout -enddate 2>/dev/null`,
        { timeout: 5000 }
      ).toString()

      const match = expiry.match(/notAfter=(.+)/)
      if (!match) return { exists: true, valid: false }

      const expiryDate = new Date(match[1])
      const now = new Date()
      const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24))

      return {
        exists: true,
        valid: daysLeft > 0,
        daysLeft,
        expiryDate: expiryDate.toISOString()
      }
    } catch {
      return { exists: true, valid: false, error: 'Cannot parse certificate' }
    }
  }

  /**
   * Generate self-signed certificate
   */
  generate() {
    if (!existsSync(CERTS_DIR)) {
      require('fs').mkdirSync(CERTS_DIR, { recursive: true })
    }

    const cmd = `openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout ${this.keyPath} \
      -out ${this.certPath} \
      -days ${this.validityDays} \
      -subj "/C=${this.country}/ST=${this.state}/L=${this.city}/O=${this.org}/CN=localhost"`

    try {
      execSync(cmd, { timeout: 30000 })
      return {
        success: true,
        certPath: this.certPath,
        keyPath: this.keyPath,
        validUntil: new Date(Date.now() + this.validityDays * 86400000).toISOString()
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Ensure valid certificates exist
   */
  ensure() {
    const check = this.checkCerts()

    if (!check.exists || !check.valid) {
      return this.generate()
    }

    return check
  }

  /**
   * Get cert info
   */
  getInfo() {
    try {
      const subject = execSync(
        `openssl x509 -in ${this.certPath} -noout -subject 2>/dev/null`,
        { timeout: 5000 }
      ).toString()

      const issuer = execSync(
        `openssl x509 -in ${this.certPath} -noout -issuer 2>/dev/null`,
        { timeout: 5000 }
      ).toString()

      return {
        subject: subject.trim(),
        issuer: issuer.trim(),
        ...this.checkCerts()
      }
    } catch {
      return { error: 'Cannot read certificate info' }
    }
  }
}
