import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../contexts/AuthContext.jsx'

export default function BackupManager() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(null)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [restoreMode, setRestoreMode] = useState(null)
  const [dryRun, setDryRun] = useState(false)
  const [restoreResult, setRestoreResult] = useState(null)
  const [backupLabel, setBackupLabel] = useState('')
  const [customFiles, setCustomFiles] = useState('')

  const fetchBackups = useCallback(async () => {
    try {
      const res = await authFetch('/api/backup/list')
      if (res.ok) {
        const data = await res.json()
        setBackups(data)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const body = { label: backupLabel || `manual-${Date.now()}` }
      if (customFiles.trim()) {
        body.files = customFiles.split('\n').map(f => f.trim()).filter(Boolean)
      }
      const res = await authFetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) {
        alert(json.error)
      } else {
        setBackupLabel('')
        setCustomFiles('')
        fetchBackups()
      }
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
    setCreating(false)
  }

  const handleRestore = async (name) => {
    setRestoring(name)
    setRestoreResult(null)
    try {
      const res = await authFetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dryRun }),
      })
      const json = await res.json()
      setRestoreResult(json)
      if (json.success && !json.dryRun) {
        fetchBackups()
      }
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
    setRestoring(null)
  }

  const handleDelete = async (name) => {
    if (!confirm(`Удалить бэкап ${name}?`)) return
    try {
      const res = await authFetch(`/api/backup/${name}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        fetchBackups()
      } else {
        alert(json.error || 'Ошибка удаления')
      }
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-sm animate-pulse">Загрузка бэкапов…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">💾 Backup Manager</h2>
        <button
          onClick={fetchBackups}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Create Backup */}
      <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
        <h3 className="text-xs font-medium text-gray-400 mb-2">Создать бэкап</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={backupLabel}
            onChange={e => setBackupLabel(e.target.value)}
            placeholder="Название (необязательно)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
          />
          <textarea
            value={customFiles}
            onChange={e => setCustomFiles(e.target.value)}
            placeholder="Файлы через запятую (опционально): backend/users.json, backend/.env"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors"
          >
            {creating ? 'Создание…' : '💾 Создать бэкап'}
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-400">Бэкапы ({backups.length})</h3>
        {backups.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">Нет бэкапов</div>
        ) : (
          backups.map((backup, idx) => (
            <div key={idx} className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs font-medium text-white">{backup.name}</span>
                  {backup.label && (
                    <span className="ml-2 text-[10px] text-gray-500">{backup.label}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <span className="text-[10px] text-gray-500">
                    {formatSize(backup.size)} • {backup.compressed ? '📦' : '📁'}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 mb-2">
                Создан: {new Date(backup.created).toLocaleString('ru')}
                {backup.files && (
                  <span className="ml-2">Файлы: {backup.files.join(', ')}</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setSelectedBackup(backup.name)
                    setRestoreMode('restore')
                    setRestoreResult(null)
                  }}
                  className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/20 text-xs py-1 rounded transition-colors"
                >
                  🔄 Восстановить
                </button>
                <button
                  onClick={() => handleDelete(backup.name)}
                  className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-600/20 text-xs px-3 rounded transition-colors"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Restore Modal */}
      {selectedBackup && restoreMode === 'restore' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Восстановление</h3>
              <button
                onClick={() => { setSelectedBackup(null); setRestoreMode(null) }}
                className="text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-gray-400">
                Бэкап: <span className="text-white font-medium">{selectedBackup}</span>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={e => setDryRun(e.target.checked)}
                  className="rounded"
                />
                Dry run (проверить без применения)
              </label>

              {dryRun && (
                <div className="bg-gray-800 rounded p-2 text-[10px] text-gray-400 font-mono">
                  Показаны файлы, которые будут восстановлены
                </div>
              )}

              <button
                onClick={() => handleRestore(selectedBackup)}
                disabled={restoring}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors"
              >
                {restoring ? 'Восстановление…' : '✅ Восстановить'}
              </button>

              {restoreResult && (
                <div className={`rounded p-2 text-xs ${
                  restoreResult.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                }`}>
                  {restoreResult.dryRun ? (
                    <div>
                      <div className="font-medium mb-1">Dry run завершён</div>
                      {restoreResult.files?.map((f, i) => (
                        <div key={i} className="text-[10px] opacity-70">
                          {f.path} {f.exists ? '→ существует' : '→ будет создан'}
                        </div>
                      ))}
                    </div>
                  ) : restoreResult.success ? (
                    <div>
                      <div className="font-medium mb-1">✅ Успешно восстановлено</div>
                      {restoreResult.restored?.map((f, i) => (
                        <div key={i} className="text-[10px] opacity-70">{f}</div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium mb-1">❌ Ошибки</div>
                      {restoreResult.errors?.map((e, i) => (
                        <div key={i} className="text-[10px] opacity-70">{e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
