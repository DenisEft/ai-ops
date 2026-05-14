import { Router } from 'express'
import { authenticateToken } from '../services/auth.js'
import { getDashboardOverview } from '../services/dashboard.js'

const router = Router()
router.use(authenticateToken)

router.get('/overview', async (req, res) => {
  try {
    const data = await getDashboardOverview()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
