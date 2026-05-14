import { useState, useCallback, memo } from 'react'
import SectionCard from './SectionCard'
import { authFetch } from '../contexts/AuthContext.jsx'

const SUB_TABS = [
  { id: 'services',   label: 'Сервисы',   icon: '🔌' },
  { id: 'openclaw',   label: 'OpenClaw',  icon: '🐾' },
  { id: 'processes',  label: 'AI Процессы', icon: '🔍' },
  { id: 'backups',    label: 'Бэкапы',     icon: '💾' },
]

function ServiceCard({ service, onControl }) {
  const active = service.active
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{service.icon || '🔌'}</span>
          <div>
            <div className="text-sm font-medium text-white">{service.label}</div>
            <div className={`text-[10px] ${active ? 'text-emerald-400' : 'text-gray-500'}`}>
              {active ? '● Active' : '○ Inactive'}
            </div>
          </div>
        </div>
        {service.pid && <span className="text-[10px] text-gray-500 font-mono">PID: {service.pid}</span>}
      </div>
      <div className="flex gap-1">
        <button onClick={() => onControl(service.name, 'start')}
          className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30 text-xs py-1.5 rounded transition-colors min-h-[44px]">
          ▶ Start
        </button>
        <button onClick={() => onControl(service.name, 'restart')}
          className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/30 text-xs py-1.5 rounded transition-colors min-h-[44px]">
          🔄
        </button>
        <button onClick={() => onControl(service.name, 'stop')}
          className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-600/30 text-xs py-1.5 rounded transition-colors min-h-[44px]">
          ⏹ Stop
        </button>
      </div>
    </div>
  )
}

function Management() {
  const [subTab, setSubTab] = useState('services')
  const [services, setServices] = useState([])
  const [ocData, setOcData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [svcRes, ocRes] = await Promise.all([
        authFetch('/api/service/list'),
        authFetch('/api/openclaw/gateway'),
      ])
      if (svcRes.ok) setServices(await svcRes.json())
      if (ocRes.ok) setOcData(await ocRes.json())
    } catch (err) {
      console.error('Management load error:', err)
    }
    setLoading(false)
  }, [])

  const controlService = useCallback(async (name, action) => {
    try {
      const res = await authFetch('/api/service/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action }),
      })
      const json = await res.json()
      if (!json.error) loadData()
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
  }, [loadData])

  const openclawAction = useCallback(async (action) => {
    try {
      const res = await authFetch(`/api/openclaw/${action}`, { method: 'POST' })
      if (res.ok) loadData()
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
  }, [loadData])

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap min-h-[44px] transition-colors ${
              subTab === tab.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Загрузка...</span>
        </div>
      ) : (
        <>
          {subTab === 'services' && (
            <div className="grid grid-cols-1 gap-2">
              {services.map(s => (
                <ServiceCard
                  key={s.name}
                  service={{
                    name: s.label,
                    label: s.label,
                    icon: s.type === 'llama' ? '🦙' : '📊',
                    active: s.active,
                    pid: s.pid,
                  }}
                  onControl={controlService}
                />
              ))}
            </div>
          )}

          {subTab === 'openclaw' && (
            <div className="space-y-3">
              {ocData ? (
                <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">🐾 OpenClaw Gateway</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      ocData.healthy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {ocData.healthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><div className="text-gray-500 mb-0.5">Model</div><div className="text-white font-mono text-[11px] truncate">{ocData.model || '—'}</div></div>
                    <div><div className="text-gray-500 mb-0.5">Sessions</div><div className="text-white font-semibold">{ocData.sessions ?? '—'}</div></div>
                    <div><div className="text-gray-500 mb-0.5">Version</div><div className="text-white font-mono text-[11px]">{ocData.version || '—'}</div></div>
                    <div><div className="text-gray-500 mb-0.5">Port</div><div className="text-white font-mono text-[11px]">{ocData.port || 18789}</div></div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openclawAction('start')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30 text-xs py-1.5 rounded transition-colors min-h-[44px]">▶ Start</button>
                    <button onClick={() => openclawAction('restart')} className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/30 text-xs py-1.5 rounded transition-colors min-h-[44px]">🔄 Restart</button>
                    <button onClick={() => openclawAction('stop')} className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-600/30 text-xs py-1.5 rounded transition-colors min-h-[44px]">⏹ Stop</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-500">Не удалось загрузить данные</div>
              )}
              <OpenClawSessions />
            </div>
          )}

          {subTab === 'processes' && <ProcessMonitor />}
          {subTab === 'backups' && <BackupList />}
        </>
      )}
    </div>
  )
}

function OpenClawSessions() {
  const [sessions, setSessions] = useState([])
  const loadSessions = useCallback(async () => {
    try { const res = await authFetch('/api/openclaw/sessions'); if (res.ok) setSessions(await res.json()) } catch {}
  }, [])

  return (
    <SectionCard title={`Сессии (${sessions.length})`} action={
      <button onClick={loadSessions} className="text-[10px] text-gray-500 hover:text-gray-300">↻</button>
    }>
      {sessions.length > 0 ? (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {sessions.slice(-20).reverse().map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-gray-400 bg-gray-950/50 rounded px-2 py-1">
              <span className="font-mono truncate flex-1">{s.id || s.label || '—'}</span>
              <span className="text-gray-600 ml-2 whitespace-nowrap">{s.kind || ''}</span>
            </div>
          ))}
        </div>
      ) : <div className="text-xs text-gray-500 text-center py-2">Нет сессий</div>}
    </SectionCard>
  )
}

function ProcessMonitor() {
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(false)
  const loadProcesses = useCallback(async () => {
    setLoading(true)
    try { const res = await authFetch('/api/process'); if (res.ok) { const json = await res.json(); setProcesses(json.processes || []) } } catch {}
    setLoading(false)
  }, [])

  const restartProcess = useCallback(async (id) => {
    try { const res = await authFetch(`/api/process/${id}/restart`, { method: 'POST' }); if (res.ok) loadProcesses() } catch (err) { alert('Ошибка: ' + err.message) }
  }, [loadProcesses])

  return (
    <SectionCard title="AI Процессы" action={
      <button onClick={loadProcesses} className="text-[10px] text-gray-500 hover:text-gray-300">↻</button>
    }>
      {loading ? <div className="text-sm text-gray-400">Загрузка...</div> : processes.length > 0 ? (
        <div className="space-y-2">
          {processes.map((p, i) => (
            <div key={i} className="bg-gray-950/50 rounded p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white">{p.label || p.id || `Процесс ${i+1}`}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.anomaly ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {p.anomaly ? 'Аномалия' : 'OK'}
                </span>
              </div>
              {p.anomaly && <div className="text-[10px] text-amber-400 mb-1">{p.anomaly}</div>}
              <button onClick={() => restartProcess(p.id)} className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/30 text-[10px] px-2 py-1 rounded transition-colors min-h-[32px]">🔄 Restart</button>
            </div>
          ))}
        </div>
      ) : <div className="text-sm text-gray-500 text-center py-4">Нет процессов</div>}
    </SectionCard>
  )
}

function BackupList() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const loadBackups = useCallback(async () => {
    setLoading(true)
    try { const res = await authFetch('/api/backup'); if (res.ok) setBackups(await res.json()) } catch {}
    setLoading(false)
  }, [])

  const createBackup = useCallback(async () => {
    try { const res = await authFetch('/api/backup', { method: 'POST' }); if (res.ok) loadBackups() } catch (err) { alert('Ошибка: ' + err.message) }
  }, [loadBackups])

  return (
    <SectionCard title="Бэкапы" action={
      <div className="flex gap-1">
        <button onClick={loadBackups} className="text-[10px] text-gray-500 hover:text-gray-300">↻</button>
        <button onClick={createBackup} className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30 text-[10px] px-2 py-0.5 rounded transition-colors min-h-[24px]">+ Создать</button>
      </div>
    }>
      {loading ? <div className="text-sm text-gray-400">Загрузка...</div> : backups.length > 0 ? (
        <div className="space-y-1.5">
          {backups.slice(-20).reverse().map((b, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-gray-950/50 rounded px-2 py-1.5">
              <div><span className="text-white">{b.type || 'manual'}</span><span className="text-gray-600 ml-2">{b.created || b.date || '—'}</span></div>
              <span className={`text-[10px] ${b.status === 'ok' || b.status === 'completed' ? 'text-emerald-400' : 'text-gray-500'}`}>{b.status || 'ok'}</span>
            </div>
          ))}
        </div>
      ) : <div className="text-sm text-gray-500 text-center py-4">Нет бэкапов</div>}
    </SectionCard>
  )
}

export default memo(Management)
