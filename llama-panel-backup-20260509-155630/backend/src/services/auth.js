import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// auth.js is in src/services/, users.json is in backend/
const USERS_FILE = path.join(__dirname, '../../users.json')
const JWT_SECRET = process.env.JWT_SECRET || 'llama-panel-secret-' + Math.random().toString(36).substring(2)
const JWT_EXPIRES_IN = '24h'

// Default users if file doesn't exist
const DEFAULT_USERS = [
  { username: 'den', password: '$2a$10$XjiQmPeadrq888hash_placeholder', name: 'Денис', role: 'admin' },
]

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
    }
  } catch (err) {
    console.error('Failed to load users:', err.message)
  }
  // Return empty if file doesn't exist or failed
  return []
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function generateToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(403).json({ error: 'Недействительный токен' })
  }

  req.user = decoded
  next()
}

export async function login(username, password) {
  const users = loadUsers()
  const user = users.find(u => u.username === username)

  if (!user) {
    return null
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return null
  }

  return {
    token: generateToken(user),
    user: { username: user.username, name: user.name, role: user.role },
  }
}

export async function changePassword(username, oldPassword, newPassword) {
  const users = loadUsers()
  const userIndex = users.findIndex(u => u.username === username)

  if (userIndex === -1) return { error: 'Пользователь не найден' }

  const valid = await verifyPassword(oldPassword, users[userIndex].password)
  if (!valid) return { error: 'Неверный пароль' }

  users[userIndex].password = await hashPassword(newPassword)
  saveUsers(users)
  return { success: true }
}

export function createUser(username, password, name = username, role = 'viewer') {
  const users = loadUsers()
  if (users.find(u => u.username === username)) {
    return { error: 'Пользователь уже существует' }
  }

  users.push({
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    role,
  })
  saveUsers(users)
  return { success: true }
}

export function listUsers() {
  const users = loadUsers()
  return users.map(u => ({
    username: u.username,
    name: u.name,
    role: u.role,
    password: undefined,
  }))
}

export function deleteUser(username) {
  const users = loadUsers()
  const filtered = users.filter(u => u.username !== username)
  if (filtered.length === users.length) return { error: 'Пользователь не найден' }
  saveUsers(filtered)
  return { success: true }
}
