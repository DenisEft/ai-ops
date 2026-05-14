import { useState, useCallback, memo } from 'react'
import SectionCard from './SectionCard'
import { authFetch } from '../contexts/AuthContext.jsx'

const SUB_TABS = [
  { id: 'config',   label: 'Конфиг',   icon: '⚙️' },
  { id: 'logs',     label: 'Логи',     icon: '📄' },
  { id: 'audit',    label: 'Аудит',    icon: '📋' },
  { id: 'alerts',   label: 'Алерты',   icon: '🔔' },
]

function Settings() {
  const [subTab, setSubTab] = useState('config')
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

      {subTab === 'config' && <ConfigTab />}
      {subTab === 'logs' && <LogsTab />}
      {subTab === 'audit' && <AuditTab />}
      {subTab === 'alerts' && <AlertsTab />}
    </div>
  )
}

function ConfigTab() {
  const [configData, setConfigData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savingMsg, setSavingMsg] = useState('')

  const loadConfig = useCallback(async () => {
    try {
      const res = await authFetch('/api/service/config')
      if (res.ok) setConfigData(await res.json())
    } catch {}
  }, [])

  const saveConfig = useCallback(async () => {
    if (!configData) return
    setSaving(true)
    try {
      const res = await authFetch('/api/service/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      })
      const json = await res.json()
      if (json.error) {
        setSavingMsg('Ошибка: ' + json.error)
      } else {
        setSavingMsg('✅ Конфиг обновлён. Перезапусти сервис для применения.')
      }
    } catch (err) {
      setSavingMsg('Ошибка: ' + err.message)
    }
    setSaving(false)
  }, [configData])

  const updateField = useCallback((key, value) => {
    setConfigData(prev => prev ? { ...prev, [key]: value } : null)
  }, [])

  return (
    <div className="space-y-3">
      <SectionCard title="AI Service Config" action={
        <button onClick={loadConfig} className="text-[10px] text-gray-500 hover:text-gray-300">↻</button>
      }>
        {configData ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['threads','gpu_layers','ctx_len','batch_size','parallel','cacheTypeK','cacheTypeV'].map(key => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">{key}</label>
                  {key.includes('cacheType') ? (
                    <select value={configData[key] || 'f16'} onChange={e => updateField(key, e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]">
                      <option value="f16">f16</option><option value="f32">f32</option><option value="q8_0">q8_0</option>
                    </select>
                  ) : (
                    <input type="number" value={configData[key] || 0} onChange={e => updateField(key, parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
                  )}
                </div>
              ))}
              <div className="flex items-center">
                <label className="flex items-center gap-1.5 text-xs text-gray-400">
                  <input type="checkbox" checked={configData.flashAttn !== false} onChange={e => updateField('flashAttn', e.target.checked)}
                    className="rounded w-4 h-4" />
                  Flash Attention
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveConfig} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded transition-colors min-h-[44px]">
                {saving ? 'Сохранение…' : '💾 Сохранить'}
              </button>
              <button onClick={() => {
                if (confirm('Перезагрузить AI service после сохранения?')) {
                  authFetch('/api/service/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'llama-8080', action: 'restart' }),
                  }).then(() => {})
                }
              }} className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/20 text-xs py-2 rounded transition-colors min-h-[44px]">
                🔄 Перезагрузить
              </button>
            </div>
            {savingMsg && <div className={`text-xs text-center py-1 rounded ${savingMsg.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{savingMsg}</div>}
          </div>
        ) : <div className="text-center py-8 text-xs text-gray-500">Не удалось загрузить конфиг</div>}
      </SectionCard>
    </div>
  )
}

function LogsTab() {
  const [logs, setLogs] = useState({})
  const [logLines, setLogLines] = useState(50)

  const loadLogs = useCallback(async (name) => {
    try {
      const res = await authFetch(`/api/service/logs?name=${name}&lines=${logLines}`)
      if (res.ok) {
        const json = await res.json()
        setLogs(prev => ({ ...prev, [name]: json }))
      }
    } catch {
      setLogs(prev => ({ ...prev, [name]: { name, logs: 'Ошибка загрузки логов' } }))
    }
  }, [logLines])

  const SERVICES = [
    { id: 'llama-8080', label: 'AI Service', icon: '🤖' },
    { id: 'ai-ops', label: 'ai-ops', icon: '📊' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={logLines} onChange={e => setLogLines(parseInt(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded text-xs px-2 py-1.5 text-gray-400 min-h-[44px]">
          <option value="20">20 строк</option>
          <option value="50">50 строк</option>
          <option value="100">100 строк</option>
          <option value="200">200 строк</option>
        </select>
      </div>

      {SERVICES.map(svc => (
        <SectionCard key={svc.id} title={`${svc.icon} ${svc.label}`} action={
          <button onClick={() => loadLogs(svc.id)} className="text-[10px] text-gray-500 hover:text-gray-300">↻</button>
        }>
          <pre className="text-[10px] text-gray-400 overflow-auto max-h-64 font-mono bg-gray-950 rounded p-2">
            {logs[svc.id]?.logs || <button onClick={() => loadLogs(svc.id)} className="text-gray-500 hover:text-gray-300">Нажмите для загрузки</button>}
          </pre>
        </SectionCard>
      ))}
    </div>
  )
}

function AuditTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const loadAudit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/audit')
      if (res.ok) setEntries(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  return (
    <SectionCard title="Аудит" action={
      <button onClick={loadAudit} className="text-[10px] text-gray-500 hover:text-gray-300">↻</button>
    }>
      {loading ? <div className="text-sm text-gray-400">Загрузка...</div> : entries.length > 0 ? (
        <div className="space-y-1.5">
          {entries.slice(-50).reverse().map((e, i) => (
            <div key={i} className="text-xs bg-gray-950/50 rounded px-2 py-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-gray-400">{e.timestamp || '—'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  e.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {e.success ? 'OK' : 'FAIL'}
                </span>
              </div>
              <div className="text-white">{e.action}</div>
              {e.details && <div className="text-gray-500 text-[10px] mt-0.5">{typeof e.details === 'string' ? e.details : JSON.stringify(e.details).substring(0, 100)}</div>}
            </div>
          ))}
        </div>
      ) : <div className="text-sm text-gray-500 text-center py-4">Нет записей</div>}
    </SectionCard>
  )
}

function AlertsTab() {
  return (
    <SectionCard title="Настройка алертов">
      <div className="space-y-3 text-xs text-gray-400">
        <p>Настройка порогов и уведомлений.</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">CPU Warning (%)</label>
            <input type="number" defaultValue={80} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">CPU Critical (%)</label>
            <input type="number" defaultValue={95} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">RAM Warning (%)</label>
            <input type="number" defaultValue={85} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">RAM Critical (%)</label>
            <input type="number" defaultValue={95} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">Temp Warning (°C)</label>
            <input type="number" defaultValue={70} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-0.5 block">Temp Critical (°C)</label>
            <input type="number" defaultValue={85} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white min-h-[44px]" />
          </div>
        </div>
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded transition-colors min-h-[44px]">
          💾 Сохранить пороги
        </button>
      </div>
    </SectionCard>
  )
}

export default memo(Settings)
