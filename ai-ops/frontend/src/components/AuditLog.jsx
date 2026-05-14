import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../contexts/AuthContext.jsx'

export default function AuditLog() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [clearing, setClearing] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', limit)
      if (filterAction) params.set('action', filterAction)
      if (filterResource) params.set('resource', filterResource)
      if (filterUser) params.set('userId', filterUser)

      const res = await authFetch(`/api/audit/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [limit, filterAction, filterResource, filterUser])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleClear = async () => {
    if (!confirm('Очистить все логи аудита?')) return
    setClearing(true)
    try {
      const res = await authFetch('/api/audit/clear', {
        method: 'POST',
      })
      if (res.ok) {
        setEntries([])
      }
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
    setClearing(false)
  }

  const getActionColor = (action) => {
    const colors = {
      login: 'text-blue-400',
      service_control: 'text-amber-400',
      service_config: 'text-purple-400',
      backup_create: 'text-emerald-400',
      backup_restore: 'text-cyan-400',
      backup_delete: 'text-red-400',
    }
    return colors[action] || 'text-gray-400'
  }

  const getActionLabel = (action) => {
    const labels = {
      login: '🔑 Вход',
      service_control: '🛠 Управление сервисом',
      service_config: '⚙️ Изменение конфига',
      backup_create: '💾 Создание бэкапа',
      backup_restore: '🔄 Восстановление',
      backup_delete: '🗑 Удаление бэкапа',
    }
    return labels[action] || action
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-sm animate-pulse">Загрузка логов…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">📋 Audit Log</h2>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            disabled={clearing}
            className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-600/20 px-2 py-1 rounded transition-colors"
          >
            🗑 Очистить
          </button>
          <button
            onClick={fetchEntries}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            placeholder="Действие (login, service_control…)"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
          />
          <input
            type="text"
            value={filterResource}
            onChange={e => setFilterResource(e.target.value)}
            placeholder="Ресурс (auth, systemd…)"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
          />
          <input
            type="text"
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            placeholder="Пользователь"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
          />
          <select
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
          >
            <option value="20">20 записей</option>
            <option value="50">50 записей</option>
            <option value="100">100 записей</option>
            <option value="200">200 записей</option>
          </select>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-1">
        {entries.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">Нет записей</div>
        ) : (
          entries.map((entry, idx) => (
            <div key={idx} className="bg-gray-900/80 border border-gray-800 rounded-lg p-2.5 text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getActionColor(entry.action)}`}>
                    {getActionLabel(entry.action)}
                  </span>
                  <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                    {entry.resource}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">
                  {new Date(entry.timestamp).toLocaleString('ru')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
                <div>
                  <span className="text-gray-500">Пользователь:</span> {entry.userId}
                </div>
                <div>
                  <span className="text-gray-500">IP:</span> {entry.ip}
                </div>
                <div>
                  <span className="text-gray-500">Статус:</span>{' '}
                  <span className={entry.success ? 'text-emerald-400' : 'text-red-400'}>
                    {entry.success ? '✅ Успешно' : '❌ Ошибка'}
                  </span>
                </div>
                {entry.details && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Детали:</span>{' '}
                    <code className="text-gray-400 font-mono">{JSON.stringify(entry.details)}</code>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
