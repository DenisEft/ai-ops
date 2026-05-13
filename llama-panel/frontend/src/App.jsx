import { useState, useEffect, useCallback } from 'react'
import { authFetch, RequireAuth } from './contexts/AuthContext.jsx'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Stats from './components/Stats'
import ErrorBoundary from './components/ErrorBoundary'

const REFRESH_INTERVAL = 3000

const SERVICES = [
  { id: 'llama-8080', label: 'llama-8080', icon: '🦙' },
  { id: 'llama-panel', label: 'llama-panel', icon: '📊' },
]

function AppContent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wsStatus, setWsStatus] = useState('connecting')
  const [tab, setTab] = useState('metrics')
  const [services, setServices] = useState([])
  const [configData, setConfigData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savingMsg, setSavingMsg] = useState('')
  const [logs, setLogs] = useState({})
  const [logLines, setLogLines] = useState(50)
  const [statsData, setStatsData] = useState(null)
  const [statsPeriod, setStatsPeriod] = useState('7d')
  const [metricsConfig, setMetricsConfig] = useState(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await authFetch('/api/metrics')
      console.log('[APP] fetchMetrics response:', res.status, res.ok)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      console.log('[APP] fetchMetrics data:', !!json, 'cpu:', json.cpu?.brand, 'mem:', json.memory?.percent)
      setData(json)
      setError(null)
      setWsStatus('connected')
    } catch (err) {
      console.error('[APP] fetchMetrics error:', err.message)
      if (err.name !== 'AbortError') {
        setError(err.message)
        setWsStatus('disconnected')
      }
    } finally {
      console.log('[APP] fetchMetrics done, loading:', false)
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch(`/api/service/stats?days=${statsPeriod.replace('d','')}&limit=100`)
      if (res.ok) {
        const json = await res.json()
        setStatsData(json)
      } else {
        setStatsData(null)
      }
    } catch {
      setStatsData(null)
    }
  }, [statsPeriod])

  useEffect(() => { fetchStats() }, [fetchStats])

  // Load metrics configuration
  useEffect(() => {
    const loadMetricsConfig = async () => {
      try {
        const res = await authFetch('/api/metrics-config')
        if (res.ok) {
          const json = await res.json()
          setMetricsConfig(json.metrics || [])
        }
      } catch (err) {
        console.error('Failed to load metrics config:', err)
      }
    }
    loadMetricsConfig()
    // Refresh config every 30s
    const interval = setInterval(loadMetricsConfig, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  const fetchServices = useCallback(async () => {
    try {
      const res = await authFetch('/api/service/list')
      if (res.ok) {
        const json = await res.json()
        setServices(json)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  const controlService = useCallback(async (id, action) => {
    try {
      const res = await authFetch('/api/service/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: id, action }),
      })
      const json = await res.json()
      if (json.error) {
        alert(json.error)
      } else {
        alert(`${id}: ${action} → ${json.success ? 'ok' : 'failed'}`)
        fetchServices()
      }
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
  }, [fetchServices])

  const loadConfig = useCallback(async () => {
    try {
      const res = await authFetch('/api/service/config')
      if (res.ok) {
        const json = await res.json()
        setConfigData(json)
      }
    } catch {
      setConfigData(null)
    }
  }, [])

  useEffect(() => { if (tab === 'config') loadConfig() }, [tab, loadConfig])

  const saveConfig = useCallback(async () => {
    if (!configData) return
    setSaving(true)
    setSavingMsg('')
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

  const tabItems = [
    { id: 'metrics', label: 'Метрики', icon: '📊' },
    { id: 'stats', label: 'Статистика', icon: '📈' },
    { id: 'control', label: 'Управление', icon: '🛠' },
    { id: 'config', label: 'Конфиг', icon: '⚙️' },
    { id: 'logs', label: 'Логи', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        wsStatus={wsStatus}
        llamaStatus={data?.llama?.status}
        onRefresh={fetchMetrics}
      />

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {(tabItems || []).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {error && tab === 'metrics' && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Metrics tab */}
        {tab === 'metrics' && (
          <ErrorBoundary>
            <Dashboard metrics={data} statsData={statsData} loading={loading} wsStatus={wsStatus} metricsConfig={metricsConfig || []} />
          </ErrorBoundary>
        )}

        {/* Stats tab */}
        {tab === 'stats' && (
          <Stats data={statsData} period={statsPeriod} setPeriod={setStatsPeriod} />
        )}

        {/* Control tab */}
        {tab === 'control' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">Управление</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(services || []).map(svc => {
                const status = services.find(s => s.name === `${svc.id}.service`)
                const active = status?.active
                return (
                  <div key={svc.id} className="bg-gray-900/80 border border-gray-800 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{svc.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white">{svc.label}</div>
                        <div className={`text-[10px] ${active ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {active ? '● active' : '○ inactive'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => controlService(svc.id, 'restart')} className="flex-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/30 text-xs py-1 rounded transition-colors">
                        🔄
                      </button>
                      <button onClick={() => controlService(svc.id, 'stop')} className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-600/20 text-xs py-1 rounded transition-colors">
                        ⏹
                      </button>
                      <button onClick={() => controlService(svc.id, 'start')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/20 text-xs py-1 rounded transition-colors">
                        ▶
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => controlService('llama-8080', 'restart')} className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/20 text-xs py-1.5 rounded transition-colors">
                llama-8080
              </button>
              <button onClick={() => controlService('llama-panel', 'restart')} className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/20 text-xs py-1.5 rounded transition-colors">
                llama-panel
              </button>
            </div>
          </div>
        )}

        {/* Config tab */}
        {tab === 'config' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">llama-8080.service</h2>
              <button onClick={loadConfig} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-0.5 rounded transition-colors">🔄</button>
            </div>

            {configData ? (
              <div className="space-y-2">
                <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {['threads','gpu_layers','ctx_len','batch_size','parallel','cacheTypeK','cacheTypeV'].map(key => (
                      <div key={key}>
                        <label className="text-[10px] text-gray-500 mb-0.5 block">{key.replace('Type', ' Type ').replace('K','K').replace('V','V')}</label>
                        {key.includes('cacheType') ? (
                          <select
                            value={configData[key] || 'f16'}
                            onChange={e => setConfigData({ ...configData, [key]: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="f16">f16</option>
                            <option value="f32">f32</option>
                            <option value="q8_0">q8_0</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={configData[key] || 0}
                            onChange={e => setConfigData({ ...configData, [key]: parseInt(e.target.value) || 0 })}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                          />
                        )}
                      </div>
                    ))}
                    <div className="flex items-center">
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={configData.flashAttn !== false}
                          onChange={e => setConfigData({ ...configData, flashAttn: e.target.checked })}
                          className="rounded"
                        />
                        Flash Attention
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded transition-colors"
                  >
                    {saving ? 'Сохранение…' : '💾 Сохранить'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Перезагрузить llama-8080 после сохранения?')) {
                        controlService('llama-8080', 'restart')
                      }
                    }}
                    className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/20 text-xs py-1.5 rounded transition-colors"
                  >
                    🔄 Перезагрузить
                  </button>
                </div>

                {savingMsg && (
                  <div className={`text-xs text-center py-1 rounded ${savingMsg.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {savingMsg}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-500">Не удалось загрузить конфиг</div>
            )}

            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
              <pre className="text-[10px] text-gray-400 overflow-auto max-h-40 font-mono">
                {`[Unit]
Description=Llama Server (Qwen 35B MoE) on port 8080
After=network.target
[Service]
Type=simple
User=den
ExecStart=/home/den/llama.cpp/build/bin/llama-server -m /mnt/models/Qwen3.6-35B-A3B-UD-IQ4_NL_XL.gguf --host 127.0.0.1 --port 8080 -ngl 99 -t 8 -c 100000 -b 8192 --cache-type-k f16 --cache-type-v f16 --flash-attn on --parallel 1 --mlock --metrics
Restart=always
RestartSec=15
[Install]
WantedBy=multi-user.target`}
              </pre>
            </div>
          </div>
        )}

        {/* Logs tab */}
        {tab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={logLines}
                onChange={e => setLogLines(parseInt(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded text-[10px] px-2 py-1 text-gray-400"
              >
                <option value="20">20 строк</option>
                <option value="50">50 строк</option>
                <option value="100">100 строк</option>
                <option value="200">200 строк</option>
              </select>
              <button onClick={() => SERVICES.forEach(s => loadLogs(s.id))} className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition-colors">🔄 Обновить</button>
            </div>

            {(SERVICES || []).map(svc => (
              <div key={svc.id} className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">{svc.icon} {svc.label}</span>
                  <button onClick={() => loadLogs(svc.id)} className="text-[10px] text-gray-500 hover:text-gray-300">🔄</button>
                </div>
                <pre className="text-[10px] text-gray-400 overflow-auto max-h-48 font-mono bg-gray-950 rounded p-2">
                  {logs[svc.id]?.logs || 'Нажмите "Обновить"'}
                </pre>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <RequireAuth>
      <AppContent />
    </RequireAuth>
  )
}
