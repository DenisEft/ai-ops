import { useState, useEffect, useRef } from 'react'
import { authFetch } from '../contexts/AuthContext.jsx'

export function useWebSocket() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('connecting')
  const abortRef = useRef(null)
  const intervalRef = useRef(null)

  const fetchData = async () => {
    try {
      if (abortRef.current) {
        abortRef.current.abort()
      }
      abortRef.current = new AbortController()

      const res = await authFetch('/api/metrics', {
        signal: abortRef.current.signal,
      })
      const json = await res.json()
      setData(json)
      setStatus('connected')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus('disconnected')
      }
    }
  }

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 5000)
    return () => {
      clearInterval(intervalRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return { data, status }
}
