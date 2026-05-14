import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { getAuditLogger } from '../services/audit.js'

const router = Router()
const auditLogger = getAuditLogger()

// Protect all audit routes
router.use(authenticateToken)

// GET /api/audit — alias for /logs (frontend expects this)
router.get('/', (req, res) => {
  const { limit, action, resource, userId } = req.query
  res.json(auditLogger.getEntries({
    limit: parseInt(limit) || 100,
    action,
    resource,
    userId
  }))
})

// GET /api/audit/logs — получить логи
router.get('/logs', (req, res) => {
  const { limit, action, resource, userId } = req.query
  res.json(auditLogger.getEntries({
    limit: parseInt(limit) || 100,
    action,
    resource,
    userId
  }))
})

// POST /api/audit/clear — очистить логи
router.post('/clear', (req, res) => {
  auditLogger.clear()
  res.json({ success: true })
})

export default router
