import { useAuth } from '../contexts/AuthContext.jsx'

const STATUS_LABELS = {
  connecting: { text: 'Подключение…', dot: 'bg-amber-400 animate-pulse' },
  connected: { text: 'Онлайн', dot: 'bg-emerald-400' },
  disconnected: { text: 'Оффлайн', dot: 'bg-red-400' },
  error: { text: 'Ошибка', dot: 'bg-red-500' },
}

export default function Header({ wsStatus, llamaStatus, onRefresh }) {
  const { user, logout } = useAuth()
  const status = STATUS_LABELS[wsStatus] || STATUS_LABELS.connecting

  return (
    <header className="bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-sm">
      <div className="max-w-[90rem] mx-auto px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🦙</span>
              <span className="text-sm font-bold text-white tracking-tight">AI Ops</span>
            </div>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              <span className="text-[10px] text-gray-400">{status.text}</span>
            </div>
            {llamaStatus && (
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  llamaStatus === 'running' ? 'bg-emerald-400' :
                  llamaStatus === 'error' ? 'bg-red-400' : 'bg-gray-500'
                }`} />
                <span className="text-[10px] text-gray-500">llama: {llamaStatus}</span>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="btn-sm btn-gray"
              title="Обновить"
            >
              ↻
            </button>
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">{user.name || user.username}</span>
                <button onClick={logout} className="text-[10px] text-gray-600 hover:text-red-400">←</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
