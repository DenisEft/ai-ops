import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../contexts/AuthContext.jsx'

export default function ProcessMonitor({ onNotify }) {
  const [report, setReport] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoRestart, setAutoRestart] = useState(false)
  const [monitoring, setMonitoring] = useState(false)

  const fetchReport = useCallback(async () => {
    try {
      const res = await authFetch('/api/process/status')
      if (res.ok) {
        const data = await res.json()
        setReport(data)
        if (data.anomalies?.length > 0) {
          const critical = data.anomalies.filter(a => a.type === 'critical')
          if (critical.length > 0 && onNotify) {
            onNotify('warning', `${critical.length} критических аномалий!`)
          }
        }
      }
    } catch (err) {
      console.error('Process monitor fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await authFetch('/api/process/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch {}
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch('/api/process/history?limit=50')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchReport()
    fetchAlerts()
    fetchHistory()
  }, [fetchReport, fetchAlerts, fetchHistory])

  useEffect(() => {
    if (!monitoring) return
    const interval = setInterval(fetchReport, 10000)
    return () => clearInterval(interval)
  }, [monitoring, fetchReport])

  const handleRestart = async (serviceName) => {
    try {
      const res = await authFetch('/api/process/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName }),
      })
      const json = await res.json()
      if (json.error) {
        alert(json.error)
      } else {
        fetchReport()
        fetchAlerts()
      }
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-sm animate-pulse">Загрузка мониторинга процессов…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">🔍 AI Process Intelligence</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMonitoring(!monitoring)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              monitoring
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/30'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {monitoring ? '⏹ Стоп' : '▶ Мониторинг'}
          </button>
          <button
            onClick={() => { setLoading(true); fetchReport(); fetchAlerts(); fetchHistory() }}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Anomaly Summary */}
      {report?.anomalies && report.anomalies.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-400">Аномалии ({report.anomalies.length})</h3>
          {report.anomalies.map((anomaly, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs ${
                anomaly.type === 'critical'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : anomaly.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-gray-500/10 border-gray-500/30 text-gray-300'
              }`}
            >
              <div className="font-medium mb-1">{anomaly.message}</div>
              <div className="text-[10px] opacity-70">
                {anomaly.metric}: {anomaly.value} (порог: {anomaly.threshold})
              </div>
              <div className="text-[10px] opacity-50 mt-1">{new Date(anomaly.timestamp).toLocaleString('ru')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Processes */}
      {report?.processes && report.processes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">Процессы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {report.processes.map((proc, idx) => (
              <div key={idx} className={`bg-gray-900/80 border rounded-lg p-3 ${
                proc.status === 'running'
                  ? 'border-emerald-500/30'
                  : proc.status === 'stopped'
                  ? 'border-red-500/30'
                  : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{proc.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      proc.status === 'running'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : proc.status === 'stopped'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {proc.status}
                    </span>
                  </div>
                  {proc.pid && <span className="text-[10px] text-gray-500">PID: {proc.pid}</span>}
                </div>
                <div className="text-[10px] text-gray-500">
                  Порт: {proc.port} • {new Date(proc.detectedAt).toLocaleString('ru')}
                </div>
                {proc.status === 'stopped' && (
                  <button
                    onClick={() => handleRestart(`${proc.name}.service`)}
                    className="mt-2 w-full bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/20 text-xs py-1 rounded transition-colors"
                  >
                    🔄 Запустить
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GPU & System */}
      {(report?.gpu || report?.system) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {report.gpu?.temperature !== null && (
            <div className={`bg-gray-900/80 border rounded-lg p-3 ${
              report.gpu.status === 'critical' ? 'border-red-500/30' :
              report.gpu.status === 'warning' ? 'border-amber-500/30' : 'border-gray-700'
            }`}>
              <div className="text-[10px] text-gray-500 mb-1">GPU Temp</div>
              <div className={`text-lg font-bold ${
                report.gpu.status === 'critical' ? 'text-red-400' :
                report.gpu.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {report.gpu.temperature}°C
              </div>
            </div>
          )}
          {report.gpu?.memory && (
            <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 mb-1">GPU VRAM</div>
              <div className="text-lg font-bold text-blue-400">
                {report.gpu.memory.used} / {report.gpu.memory.total} MB
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${report.gpu.memory.percent}%` }}
                />
              </div>
            </div>
          )}
          {report.system?.cpuLoad !== undefined && (
            <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 mb-1">CPU Load</div>
              <div className="text-lg font-bold text-purple-400">
                {report.system.cpuLoad}%
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                <div
                  className="bg-purple-500 h-1.5 rounded-full"
                  style={{ width: `${report.system.cpuLoad}%` }}
                />
              </div>
            </div>
          )}
          {report.system?.ramLoad !== undefined && (
            <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 mb-1">RAM</div>
              <div className="text-lg font-bold text-cyan-400">
                {report.system.ramLoad}%
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full"
                  style={{ width: `${report.system.ramLoad}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* LLM Metrics */}
      {report?.llama && (
        <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3">
          <h3 className="text-xs font-medium text-gray-400 mb-2">LLM Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Tokens/sec:</span>
              <span className="ml-2 font-medium text-emerald-400">
                {report.llama.tokenRate?.toFixed(1) ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Decoded:</span>
              <span className="ml-2 font-medium text-white">
                {report.llama.metrics?.llama_tokens_decoded ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Promoted:</span>
              <span className="ml-2 font-medium text-white">
                {report.llama.metrics?.llama_tokens_promoted ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Context:</span>
              <span className="ml-2 font-medium text-white">
                {report.llama.metrics?.llama_context_size ?? '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts History */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">История алертов ({alerts.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {alerts.slice(-10).reverse().map((alert, idx) => (
              <div key={idx} className="text-[10px] text-gray-400 bg-gray-900/50 rounded p-1.5">
                <span className="text-gray-500">{new Date(alert.timestamp).toLocaleString('ru')}</span>
                {' — '}{alert.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
