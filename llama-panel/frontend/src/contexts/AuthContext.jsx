import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API = '/api/auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[AUTH] Component mounted, checking localStorage')
    const token = localStorage.getItem('llama-panel-token')
    console.log('[AUTH] Token exists:', !!token)
    
    if (token) {
      console.log('[AUTH] Fetching /me to verify token')
      fetch(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          console.log('[AUTH] /me response status:', res.status)
          if (res.ok) return res.json()
          throw new Error('Invalid token')
        })
        .then(data => {
          console.log('[AUTH] Token valid, user:', data.user)
          setUser(data.user)
        })
        .catch(err => {
          console.warn('[AUTH] Token invalid, clearing:', err.message)
          localStorage.removeItem('llama-panel-token')
        })
        .finally(() => {
          console.log('[AUTH] Loading complete, user:', !!user || !!localStorage.getItem('llama-panel-token') ? 'SET' : 'NONE')
          setLoading(false)
        })
    } else {
      console.log('[AUTH] No token, showing login')
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    console.log('[AUTH] Logging in as:', username)
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()

    if (!res.ok || !data.token) {
      console.error('[AUTH] Login failed:', data.error)
      throw new Error(data.error || 'Ошибка авторизации')
    }

    console.log('[AUTH] Login success')
    localStorage.setItem('llama-panel-token', data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    console.log('[AUTH] Logging out')
    localStorage.removeItem('llama-panel-token')
    setUser(null)
  }, [])

  const value = { user, loading, login, logout, isAuthenticated: !!user }
  console.log('[AUTH] Render: user=', !!user, 'loading=', loading)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

// Wrapper component that protects routes
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  
  console.log('[REQUIRE_AUTH] loading=', loading, 'user=', !!user)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400 text-sm">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('[REQUIRE_AUTH] No user, rendering Login')
    return <Login />
  }

  console.log('[REQUIRE_AUTH] User exists, rendering children')
  return children
}

// Login page
function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return

    setLoading(true)
    setError('')

    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-full max-w-md p-8 rounded-2xl bg-gray-900/80 border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
            <span className="text-3xl">🦙</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Llama Panel</h1>
          <p className="text-gray-400 mt-1">Введите учётные данные для входа</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Логин</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="den"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Вход...
              </span>
            ) : (
              'Войти'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>🔒 Защита API и фронтенда</p>
          <p className="mt-1">Токен хранится в localStorage (24 часа)</p>
        </div>
      </div>
    </div>
  )
}

// Fetch wrapper that adds auth token
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('llama-panel-token')
  const headers = {
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(url, { ...options, headers })
}
