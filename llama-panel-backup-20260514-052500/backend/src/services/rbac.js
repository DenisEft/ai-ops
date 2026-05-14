/**
 * Role-Based Access Control
 * - admin: полный доступ
 * - viewer: чтение метрик, без управления
 * - readonly: только чтение метрик и статуса
 */

export const ROLES = {
  admin: {
    label: 'Администратор',
    permissions: [
      'metrics:read',
      'service:control',
      'service:config',
      'auth:manage',
      'backup:read',
      'backup:create',
      'backup:restore',
      'backup:delete',
      'process:monitor',
      'config:read',
      'config:write'
    ]
  },
  viewer: {
    label: 'Наблюдатель',
    permissions: [
      'metrics:read',
      'process:monitor'
    ]
  },
  readonly: {
    label: 'Только чтение',
    permissions: [
      'metrics:read'
    ]
  }
}

/**
 * Check if user has permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false
  const role = ROLES[user.role]
  if (!role) return false
  return role.permissions.includes(permission)
}

/**
 * Middleware: require specific permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user

    if (!user) {
      return res.status(401).json({ error: 'Не авторизован' })
    }

    if (!hasPermission(user, permission)) {
      return res.status(403).json({
        error: 'Доступ запрещён',
        required: permission,
        role: user.role
      })
    }

    next()
  }
}

/**
 * Middleware: require any of permissions
 */
export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const user = req.user

    if (!user) {
      return res.status(401).json({ error: 'Не авторизован' })
    }

    const hasAny = permissions.some(p => hasPermission(user, p))

    if (!hasAny) {
      return res.status(403).json({
        error: 'Доступ запрещён',
        required: permissions,
        role: user.role
      })
    }

    next()
  }
}

/**
 * Get user's accessible endpoints
 */
export function getAccessibleEndpoints(user) {
  if (!user || !user.role) return []

  const role = ROLES[user.role]
  if (!role) return []

  const endpoints = {}

  for (const perm of role.permissions) {
    const [resource, action] = perm.split(':')
    if (!endpoints[resource]) endpoints[resource] = []
    endpoints[resource].push(action)
  }

  return endpoints
}
