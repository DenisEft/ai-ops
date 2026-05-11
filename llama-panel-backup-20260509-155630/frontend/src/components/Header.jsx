import { useAuth } from '../contexts/AuthContext.jsx'

const STATUS_LABELS = {
  connecting: { text: 'Подключение…', color: 'text-amber-400' },
  connected: { text: 'Подключено', color: 'text-emerald-400' },
  disconnected: { text: 'Отключено', color: 'text-red-400' },
  error: { text: 'Ошибка', color: 'text-red-500' },
}

export default function Header({ onReconnect, data, wsStatus = 'connecting' }) {
  const { user, logout } = useAuth()
  const status = STATUS_LABELS[wsStatus] || STATUS_LABELS.connecting
  const lastUpdate = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString('ru-RU')
    : '--:--:--'

  return (
    <header className="bg-gray-900/80 border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦙</span>
            <span className="text-sm font-semibold text-white">Llama Panel</span>
            <span className="text-[10px] text-gray-600">|</span>
            <span className={`text-[10px] ${status.color}`}>● {status.text}</span>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate !== '--:--:--' && (
              <span className="text-[10px] text-gray-600 hidden md:block">
                обновлено {lastUpdate}
              </span>
            )}

            {user && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{user.name || user.username}</span>
                <button
                  onClick={logout}
                  className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                >
                  ←
                </button>
              </div>
            )}

            {(wsStatus === 'disconnected' || wsStatus === 'error') && (
              <button
                onClick={onReconnect}
                className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition-colors"
              >
                Подключиться
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
