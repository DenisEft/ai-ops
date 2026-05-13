import { Router } from 'express'
import * as authService from '../services/auth.js'
import authLimiter from '../services/rate-limit.js'
import { getAuditLogger } from '../services/audit.js'

const router = Router()
const audit = getAuditLogger()

// Login — rate limited
router.post('/login', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  if (!authLimiter.check(ip)) {
    return res.status(429).json({ error: 'Слишком много попыток. Подождите минуту.' })
  }
  next()
}, async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Укажите логин и пароль' })
    }

    const result = await authService.login(username, password)
    if (!result) {
      audit.log({ action: 'login', resource: 'auth', ip, success: false, details: { username } })
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    audit.log({ action: 'login', resource: 'auth', userId: result.user.username, ip, success: true })
    res.json(result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Login error:', err)
    res.status(500).json({ error: 'Ошибка авторизации' })
  }
})

// Change password
router.post('/change-password', authService.authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    const result = await authService.changePassword(req.user.username, oldPassword, newPassword)
    res.json(result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Ошибка при смене пароля' })
  }
})

// List users
router.get('/users', authService.authenticateToken, (req, res) => {
  try {
    const users = authService.listUsers()
    res.json({ users })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List users error:', err)
    res.status(500).json({ error: 'Ошибка при получении списка пользователей' })
  }
})

// Create user (admin only)
router.post('/users', authService.authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администратор может создавать пользователей' })
    }
    const { username, password, name, role } = req.body
    const result = authService.createUser(username, password, name, role)
    if (result.error) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Ошибка при создании пользователя' })
  }
})

// Delete user (admin only)
router.delete('/users/:username', authService.authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только администратор может удалять пользователей' })
    }
    const result = authService.deleteUser(req.params.username)
    if (result.error) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Ошибка при удалении пользователя' })
  }
})

// Verify token / get current user
router.get('/me', authService.authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

export default router
