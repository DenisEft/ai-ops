import { execSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, unlinkSync } from 'fs'
import { join, basename, dirname } from 'path'
import { createWriteStream } from 'fs'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'

const BACKUP_DIR = join(process.cwd(), 'backups')
const MAX_BACKUPS = 30 // keep last 30 backups
const AUTO_BACKUP_INTERVAL = 3600000 // 1 hour

/**
 * Config Backup & Restore Service
 * - Автосоздание бэкапов конфигов
 * - Ручные бэкапы через API
 * - Восстановление из бэкапа через API
 * - Версионирование бэкапов
 * - Сжатие gzip
 */
export class ConfigBackup {
  constructor(config = {}) {
    this.paths = config.paths || [
      'metrics-config.json',
      'users.json',
      '.env',
      'src/services/config.js'
    ]
    this.autoBackup = config.autoBackup ?? true
    this.backupDir = BACKUP_DIR
    this.lastBackup = null
    this.cleanupInterval = null

    if (this.autoBackup) {
      this.startAutoBackup()
    }
  }

  /**
   * Get current timestamp for filename
   */
  timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  }

  /**
   * Create a backup of specified paths
   */
  async createBackup(options = {}) {
    const { label = '', compress = true, paths = null } = options
    const backupName = `backup-${this.timestamp()}`
    const backupPath = join(this.backupDir, backupName)
    const createdFiles = []

    // Ensure backup directory
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }

    const pathsToBackup = paths || this.paths

    for (const relPath of pathsToBackup) {
      const fullPath = join(process.cwd(), relPath)

      if (!existsSync(fullPath)) {
        console.warn(`[backup] File not found: ${fullPath}`)
        continue
      }

      const destDir = join(backupPath, dirname(relPath))
      mkdirSync(destDir, { recursive: true })

      copyFileSync(fullPath, join(backupPath, relPath))
      createdFiles.push(relPath)
    }

    if (createdFiles.length === 0) {
      return { success: false, error: 'No files found to backup' }
    }

    // Create metadata
    const metadata = {
      name: backupName,
      label: label || `Backup ${this.timestamp()}`,
      created: new Date().toISOString(),
      files: createdFiles,
      compressed: false
    }
    writeFileSync(join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

    // Compress to tar.gz
    let archivePath = null
    if (compress) {
      try {
        archivePath = await this.compressBackup(backupName)
      } catch (err) {
        console.warn(`[backup] Compression failed: ${err.message}`)
      }
    }

    this.lastBackup = { ...metadata, archive: archivePath }

    // Cleanup old backups
    await this.cleanupOldBackups()

    return {
      success: true,
      backup: this.lastBackup,
      files: createdFiles
    }
  }

  /**
   * Compress backup directory to tar.gz
   */
  async compressBackup(backupName) {
    const backupPath = join(this.backupDir, backupName)
    const archivePath = join(this.backupDir, `${backupName}.tar.gz`)

    // Use tar command via exec
    execSync(
      `cd ${this.backupDir} && tar -czf ${backupName}.tar.gz ${backupName} && rm -rf ${backupName}`,
      { timeout: 30000 }
    )

    return archivePath
  }

  /**
   * List all backups
   */
  listBackups() {
    if (!existsSync(this.backupDir)) return []

    const entries = readdirSync(this.backupDir)
    const backups = []

    for (const entry of entries) {
      const fullPath = join(this.backupDir, entry)
      const stat = statSync(fullPath)

      // Match either directory or .tar.gz file
      if (entry.startsWith('backup-') && (stat.isDirectory() || entry.endsWith('.tar.gz'))) {
        const metadataPath = stat.isDirectory()
          ? join(fullPath, 'metadata.json')
          : null

        let metadata = { name: entry, created: stat.mtime.toISOString() }
        if (metadataPath && existsSync(metadataPath)) {
          metadata = { ...metadata, ...JSON.parse(readFileSync(metadataPath, 'utf-8')) }
        }

        backups.push({
          ...metadata,
          size: stat.isDirectory() ? this.getDirSize(fullPath) : stat.size,
          compressed: entry.endsWith('.tar.gz')
        })
      }
    }

    // Sort by creation date, newest first
    backups.sort((a, b) => new Date(b.created) - new Date(a.created))
    return backups
  }

  /**
   * Get directory size in bytes
   */
  getDirSize(dir) {
    let total = 0
    const files = readdirSync(dir, { withFileTypes: true })

    for (const file of files) {
      const fullPath = join(dir, file.name)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        total += this.getDirSize(fullPath)
      } else {
        total += stat.size
      }
    }
    return total
  }

  /**
   * Restore from a backup
   */
  async restore(backupName, options = {}) {
    const { files = null, dryRun = false } = options
    const backupPath = join(this.backupDir, backupName)

    // Check if it's a compressed archive
    const archivePath = join(this.backupDir, `${backupName}.tar.gz`)
    if (!existsSync(backupPath) && existsSync(archivePath)) {
      await this.extractBackup(backupName)
    }

    if (!existsSync(backupPath)) {
      return { success: false, error: `Backup not found: ${backupName}` }
    }

    // Read metadata
    const metadataPath = join(backupPath, 'metadata.json')
    const metadata = existsSync(metadataPath)
      ? JSON.parse(readFileSync(metadataPath, 'utf-8'))
      : { files: [] }

    const filesToRestore = files || metadata.files

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        files: filesToRestore.map(f => ({
          path: f,
          source: join(backupPath, f),
          exists: existsSync(join(process.cwd(), f))
        }))
      }
    }

    const restored = []
    const errors = []

    for (const relPath of filesToRestore) {
      const source = join(backupPath, relPath)
      const dest = join(process.cwd(), relPath)

      if (!existsSync(source)) {
        errors.push(`Source not found: ${relPath}`)
        continue
      }

      try {
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(source, dest)
        restored.push(relPath)
      } catch (err) {
        errors.push(`${relPath}: ${err.message}`)
      }
    }

    return {
      success: errors.length === 0,
      restored,
      errors,
      dryRun: false
    }
  }

  /**
   * Extract compressed backup
   */
  async extractBackup(backupName) {
    const archivePath = join(this.backupDir, `${backupName}.tar.gz`)
    if (!existsSync(archivePath)) {
      throw new Error(`Archive not found: ${archivePath}`)
    }

    execSync(
      `cd ${this.backupDir} && tar -xzf ${backupName}.tar.gz`,
      { timeout: 30000 }
    )

    return true
  }

  /**
   * Delete a backup
   */
  deleteBackup(backupName) {
    const backupPath = join(this.backupDir, backupName)
    const archivePath = join(this.backupDir, `${backupName}.tar.gz`)

    if (existsSync(backupPath)) {
      execSync(`rm -rf ${backupPath}`)
    }
    if (existsSync(archivePath)) {
      unlinkSync(archivePath)
    }

    return true
  }

  /**
   * Cleanup old backups (keep last MAX_BACKUPS)
   */
  async cleanupOldBackups() {
    const backups = this.listBackups()

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS)
      for (const backup of toDelete) {
        this.deleteBackup(backup.name)
      }
    }
  }

  /**
   * Start auto-backup timer
   */
  startAutoBackup() {
    this.cleanupInterval = setInterval(() => {
      this.createBackup({ label: 'auto' })
    }, AUTO_BACKUP_INTERVAL)
  }

  /**
   * Stop auto-backup
   */
  stopAutoBackup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Singleton instance
let backupInstance = null

export function getConfigBackup(config) {
  if (!backupInstance) {
    backupInstance = new ConfigBackup(config)
  }
  return backupInstance
}
