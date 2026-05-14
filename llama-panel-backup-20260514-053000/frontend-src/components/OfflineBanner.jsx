import { useState, useEffect } from 'react'

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600/90 text-white text-center text-xs py-1.5 z-[60] backdrop-blur-sm">
      ⚠️ Нет подключения к интернету. Данные могут быть устаревшими.
    </div>
  )
}

export default OfflineBanner
