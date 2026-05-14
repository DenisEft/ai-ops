import { useState, useEffect, createContext, useContext, useMemo } from 'react'

const API = '/api/auth'

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('ai-ops-token')
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  }
  const res = await fetch(url, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('ai-ops-token')
    // Don't reload — just return the response, let caller handle it
  }
  return res
}

export async function login(username, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) {
    return { error: data.error || 'Ошибка авторизации' }
  }
  localStorage.setItem('ai-ops-token', data.token)
  return data
}

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('[useAuth] Must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ai-ops-token')
    if (token) {
      fetch(`${API}/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => {
          if (res.ok) return res.json()
          localStorage.removeItem('ai-ops-token')
          setUser(null)
        })
        .then(data => {
          if (data) setUser(data)
        })
        .catch(() => {
          localStorage.removeItem('ai-ops-token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const value = useMemo(() => ({ user, setUser, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function RequireAuth({ children, fallback }) {
  const { user, loading } = useAuth()
  
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
    return fallback || null
  }

  return children
}

export function LogoutButton() {
  const { setUser } = useAuth()
  const handleLogout = () => {
    localStorage.removeItem('ai-ops-token')
    setUser(null)
  }
  return (
    <button onClick={handleLogout} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
      Выйти
    </button>
  )
}
