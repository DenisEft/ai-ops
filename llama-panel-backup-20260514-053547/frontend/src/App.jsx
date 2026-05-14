import { useState, useCallback, useEffect } from 'react'
import { RequireAuth, login } from './contexts/AuthContext.jsx'
import BottomTabBar from './components/BottomTabBar.jsx'
import Overview from './components/Overview.jsx'
import Management from './components/Management.jsx'
import Settings from './components/Settings.jsx'
import Metrics from './components/Metrics.jsx'
import { SkeletonFull } from './components/Skeleton.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import { useDashboard } from './hooks/useDashboard.js'
import LoginPage from './components/LoginPage.jsx'

function AppContent() {
  const [activeTab, setActiveTab] = useState('overview')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const { data, loading, error, refresh } = useDashboard()

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  const handleNotify = useCallback((type, msg) => {
    console.log(`[${type}] ${msg}`)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview data={data} loading={loading} error={error} onRefresh={refresh} />
      case 'management':
        return <Management onNotify={handleNotify} />
      case 'settings':
        return <Settings />
      case 'metrics':
        return <Metrics />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      <OfflineBanner />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🦙</span>
                <span className="text-sm font-bold text-white tracking-tight">Llama Panel</span>
              </div>
              <div className="h-4 w-px bg-gray-700" />
              {data?.status && (
                <div className="flex items-center gap-2">
                  {Object.entries(data.status).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        val === 'ok' ? 'bg-emerald-400' : val === 'error' || val === 'offline' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                      <span className="text-[10px] text-gray-500">{key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} className="text-sm text-gray-500 hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button onClick={refresh} className="text-sm text-gray-500 hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                ↻
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-3 md:p-4">
        {loading ? <SkeletonFull /> : renderTab()}
      </main>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function App() {
  return (
    <RequireAuth fallback={<LoginPage />} >
      <AppContent />
    </RequireAuth>
  )
}
