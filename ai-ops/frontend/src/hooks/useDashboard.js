import { useState, useEffect, useCallback } from 'react'

const POLL_INTERVAL = 3000 // 3 seconds

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('ai-ops-token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/dashboard/overview', { headers })
      if (res.status === 401) {
        localStorage.removeItem('ai-ops-token')
        // Soft logout — don't reload, let AuthContext handle redirect
        setData(null)
        setError('Сессия истекла')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
      // Don't clear data on error - keep showing last known state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchDashboard()
  }, [fetchDashboard])

  return { data, loading, error, refresh }
}
