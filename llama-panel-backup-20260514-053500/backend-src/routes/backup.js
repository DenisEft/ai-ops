import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { requirePermission } from '../services/rbac.js'
import { getConfigBackup } from '../services/config-backup.js'
import { getAuditLogger } from '../services/audit.js'

const router = Router()
const backup = getConfigBackup()
const audit = getAuditLogger()

// Protect all backup routes
router.use(authenticateToken)

// GET /api/backup — алиас для /list
router.get('/', (req, res) => {
  res.json(backup.listBackups())
})

// GET /api/backup/list — список бэкапов
router.get('/list', (req, res) => {
  res.json(backup.listBackups())
})

// POST /api/backup — алиас для /create
router.post('/', requirePermission('backup:create'), async (req, res) => {
  try {
    const { label, files } = req.body
    const result = await backup.createBackup({
      label: label || `manual-${Date.now()}`,
      paths: files
    })
    audit.log({ action: 'backup_create', resource: 'config', details: { label }, success: result.success })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/backup/create — создать бэкап
router.post('/create', requirePermission('backup:create'), async (req, res) => {
  try {
    const { label, files } = req.body
    const result = await backup.createBackup({
      label: label || `manual-${Date.now()}`,
      paths: files
    })
    audit.log({ action: 'backup_create', resource: 'config', details: { label }, success: result.success })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/backup/restore — восстановить из бэкапа
router.post('/restore', requirePermission('backup:restore'), async (req, res) => {
  try {
    const { name, files, dryRun } = req.body
    const result = await backup.restore(name, { files, dryRun: dryRun === true })
    audit.log({ action: 'backup_restore', resource: name, details: { dryRun }, success: result.success })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/backup/:name — удалить бэкап
router.delete('/:name', requirePermission('backup:delete'), (req, res) => {
  try {
    backup.deleteBackup(req.params.name)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
