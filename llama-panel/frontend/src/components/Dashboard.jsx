import { useState, useEffect } from 'react'
import { useWidgetConfig } from '../hooks/useWidgetConfig'
import GaugeWidget from './GaugeWidget'
import MetricsManager from './MetricsManager'

export default function Dashboard({ metrics, loading, metricsConfig }) {
  const { widgets, reset } = useWidgetConfig()
  const safeWidgets = Array.isArray(widgets) ? widgets : []
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [metricsManagerOpen, setMetricsManagerOpen] = useState(false)
  
  const getWidgetData = (id) => {
    if (!metrics) return null
    const n = (v) => { const x = Number(v); return (typeof x === 'number' && isFinite(x)) ? x : null }
    
    switch (id) {
      case 'cpu': {
        const c = metrics.cpu || {}
        return { cpuUsage: n(c.usage), cpuBrand: c.brand || 'CPU', cpuCores: n(c.cores) || 0, cpuTemp: (c.temperature > 0) ? c.temperature : 'N/A' }
      }
      case 'memory': {
        const m = metrics.memory || {}
        return { total: n(m.total) || 0, used: n(m.used) || 0, available: n(m.available) || 0, percent: n(m.percent) }
      }
      case 'gpu': {
        const g = metrics.gpu || {}
        return { gpuModel: g.name || 'GPU', vramUsed: n(g.memoryUsed) ?? 0, vramTotal: n(g.memoryTotal) ?? 0, gpuTemp: n(g.temperature) ?? 0, gpuPower: n(g.powerDraw) ?? 0, gpuClock: 0 }
      }
      case 'disk': {
        const d = metrics.disk || {}
        const t = n(d.total) || 0, u = n(d.used) || 0
        return { total: t, used: u, available: Math.max(0, t - u), percent: n(d.percent) }
      }
      case 'load': {
        const l = metrics.load || {}
        const parts = [l.load1, l.load5, l.load15].filter(v => v != null)
        return { loadAverage: parts.join(' ') || 'N/A', load1: n(l.load1), load5: n(l.load5), load15: n(l.load15), cpuCores: l.cores || 4 }
      }
      case 'gpu-power':
        return { gpuPower: n(metrics.gpuPower) ?? 0 }
      case 'service-status':
        return { services: metrics.services || {} }
      default:
        return metrics[id] || null
    }
  }
  
  const renderWidget = (widget) => {
    try {
      const baseData = getWidgetData(widget.id)
      return <GaugeWidget key={widget.id} metric={{ data: baseData }} widget={widget} />
    } catch (err) {
      console.error(`[WIDGET] Error rendering widget ${widget?.id}:`, err)
      return (
        <div key={widget?.id} className="bg-red-900/30 border border-red-800/60 rounded-lg p-3">
          <div className="text-red-400 text-[10px]">Ошибка: {widget?.id || 'unknown'}</div>
        </div>
      )
    }
  }
  
  // Filter out stats-type widgets from metrics tab (they belong in Stats tab)
  const STATS_IDS = new Set(['stats', 'stat', 'tokens', 'requests', 'tokens-per-sec', 'temperature', 'token-rate'])
  const enabledWidgets = safeWidgets.filter(w => w.enabled && !STATS_IDS.has(w.id))
  
  // Also filter out any widget whose type is 'stats'
  const _metricsOnlyWidgets = enabledWidgets.filter(w => w.type !== 'stats' && w.type !== 'chart' && w.type !== 'table' && w.type !== 'status')
  
  // Stats-related widget IDs to exclude from Metrics tab
  const STATS_WIDGET_IDS = new Set(['stats', 'stat', 'tokens', 'requests', 'tokens-per-sec', 'temperature', 'token-rate', 'gpu-power', 'service-status'])
  
  // Filter out stats widgets from the grid - they only belong in Stats tab
  const GRID_WIDGETS = enabledWidgets.filter(w => !STATS_WIDGET_IDS.has(w.id))
  const hasEnabledWidgets = GRID_WIDGETS.length > 0
  
  useEffect(() => {
    if (!hasEnabledWidgets && loading === false) {
      reset()
    }
  }, [hasEnabledWidgets, loading, reset])
  
  // KPI row
  const kpis = []
  if (metrics) {
    const cpu = metrics.cpu?.usage
    if (cpu !== undefined && cpu !== null) kpis.push({ label: 'CPU', value: `${Math.round(cpu)}%`, color: cpu > 80 ? 'red' : cpu > 60 ? 'amber' : 'blue' })
    
    const mem = metrics.memory?.percent
    if (mem !== undefined && mem !== null) kpis.push({ label: 'RAM', value: `${Math.round(mem)}%`, color: mem > 90 ? 'red' : mem > 70 ? 'amber' : 'blue' })
    
    const gpu = metrics.gpu?.memoryUsed
    if (gpu !== undefined && gpu !== null && metrics.gpu?.memoryTotal > 0) {
      const pct = Math.round((gpu / metrics.gpu.memoryTotal) * 100)
      kpis.push({ label: 'VRAM', value: `${Math.round(pct)}%`, color: pct > 90 ? 'red' : pct > 70 ? 'amber' : 'purple' })
    }
    
    const gpuTemp = metrics.gpu?.temperature
    if (gpuTemp !== undefined && gpuTemp !== null && gpuTemp > 0) kpis.push({ label: 'GPU T', value: `${Math.round(gpuTemp)}°`, color: gpuTemp > 80 ? 'red' : 'cyan' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-[9px]">Загрузка метрик…</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* KPI Row */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-2">
          {kpis.map((kpi, i) => (
            <div key={i} className="kpi-card py-1.5">
              <div className="kpi-label text-[9px]">{kpi.label}</div>
              <div className={`kpi-value-sm text-${kpi.color}-400 text-sm`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Widget grid */}
      {hasEnabledWidgets ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {GRID_WIDGETS.map(w => (
            <div key={w.id}>
              {renderWidget(w)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-[10px] mb-2">Включите хотя бы один виджет</p>
          <button onClick={() => setSettingsOpen(true)} className="btn-sm btn-blue text-[10px]">Настройки</button>
        </div>
      )}
      
      {/* Settings button */}
      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="fixed bottom-3 right-3 z-30 w-7 h-7 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all text-sm shadow-lg"
        title="Настройки виджетов"
      >
        ⚙
      </button>
      
      {/* Metrics manager */}
      {metricsManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto">
            <div className="p-3">
              <MetricsManager metrics={Array.isArray(metricsConfig) ? metricsConfig : []} onClose={() => setMetricsManagerOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
