import { useState, useEffect, useCallback, useRef } from 'react'

// Get token from localStorage (set by AuthContext after login)
function getAuthHeader() {
  const token = localStorage.getItem('llama-panel-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function useMetrics(refreshInterval = 5000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      setLoading(true)
      const res = await fetch('/api/metrics', {
        signal: abortRef.current.signal,
        headers: getAuthHeader(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchData, refreshInterval])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh }
}
