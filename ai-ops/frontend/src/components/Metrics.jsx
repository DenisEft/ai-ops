import { useState, useCallback, useEffect, memo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart
} from 'recharts'
import { authFetch } from '../contexts/AuthContext.jsx'

const CHARTS = [
  { id: 'cpu',       label: 'CPU Usage',   unit: '%',  color: '#3b82f6', max: 100, metric: 'cpu' },
  { id: 'memory',    label: 'Memory',      unit: '%',  color: '#10b981', max: 100, metric: 'memory' },
  { id: 'gpu',       label: 'GPU Load',    unit: '%',  color: '#8b5cf6', max: 100, metric: 'gpu' },
  { id: 'gpuTemp',   label: 'GPU Temp',    unit: '°C', color: '#ef4444', max: 100, metric: 'gpuTemp' },
  { id: 'vram',      label: 'VRAM',        unit: '%',  color: '#f59e0b', max: 100, metric: 'vram' },
  { id: 'tokens',    label: 'Tokens/sec',  unit: 't/s',color: '#06b6d4', max: 200, metric: 'tokensPerSec' },
]

const RANGES = [
  { id: '1h',  label: '1ч' },
  { id: '6h',  label: '6ч' },
  { id: '24h', label: '24ч' },
  { id: '7d',  label: '7д' },
]

function ChartCard({ chart, data, range }) {
  const min = 0
  const max = chart.max || 100

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-white">{chart.label}</div>
          <div className="text-[10px] text-gray-500">{range} · {data.length} точек</div>
        </div>
        {data.length > 0 && (
          <div className="text-lg font-bold" style={{ color: chart.color }}>
            {data[data.length - 1]?.value.toFixed(1)}{chart.unit}
          </div>
        )}
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chart.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              tickFormatter={(v) => {
                try { return new Date(v).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 9, fill: '#6b7280' }}
              tickFormatter={(v) => v.toFixed(0)}
              width={28}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f9fafb',
              }}
              labelFormatter={(v) => {
                try { return new Date(v).toLocaleString('ru-RU') } catch { return '' }
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chart.color}
              fill={`url(#grad-${chart.id})`}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Metrics() {
  const [range, setRange] = useState('24h')
  const [chartData, setChartData] = useState({})
  const [loading, setLoading] = useState(true)

  const loadChartData = useCallback(async () => {
    setLoading(true)
    try {
      const promises = CHARTS.map(async (chart) => {
        try {
          const res = await authFetch(`/api/metrics/history?metric=${chart.metric}&range=${range}`)
          if (res.ok) {
            const data = await res.json()
            return { id: chart.id, data }
          }
        } catch {}
        return null
      })
      const results = await Promise.all(promises)
      const map = {}
      results.forEach(r => { if (r) map[r.id] = r.data })
      setChartData(map)
    } catch (err) {
      console.error('Metrics load error:', err)
    }
    setLoading(false)
  }, [range])

  useEffect(() => {
    loadChartData()
  }, [loadChartData])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadChartData, 30000)
    return () => clearInterval(interval)
  }, [loadChartData])

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap min-h-[44px] transition-colors ${
              range === r.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Загрузка графиков...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHARTS.map(chart => (
            <ChartCard
              key={chart.id}
              chart={chart}
              data={chartData[chart.id] || []}
              range={range}
            />
          ))}
        </div>
      )}

      {/* No data message */}
      {Object.values(chartData).every(d => d.length === 0) && (
        <div className="text-center py-8 text-sm text-gray-500">
          Нет данных для отображения. Метрики собираются каждые 30 секунд.
        </div>
      )}
    </div>
  )
}

export default memo(Metrics)
