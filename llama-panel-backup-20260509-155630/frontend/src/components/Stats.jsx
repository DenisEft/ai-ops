import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../contexts/AuthContext.jsx'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n?.toString?.() || '—'
}

function formatMs(ms) {
  if (!ms) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`
  return `${(ms / 3600000).toFixed(1)}h`
}

const PERIODS = [
  { label: '1д', value: '1d' },
  { label: '3д', value: '3d' },
  { label: '7д', value: '7d' },
  { label: '30д', value: '30d' },
  { label: '90д', value: '90d' },
]

const PIE_COLORS = ['#A855F7', '#F59E0B']

export default function Stats({ period: initialPeriod = '7d' }) {
  const [period, setPeriod] = useState(initialPeriod)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/service/stats?period=${period}&limit=500`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  if (loading && !data) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return <div className="text-xs text-red-400">{error}</div>
  if (!data) return null

  const { summary, byDay, requests } = data

  const chartData = byDay.map(d => ({
    name: d.date.slice(5),
    tokens: d.tokens || 0,
    prompt: d.promptTokens || 0,
    eval: d.evalTokens || 0,
    requests: d.requests || 0,
  }))

  const recent = (requests || []).slice(0, 15)

  const pieData = [
    { name: 'Prompt', value: summary.totalPromptTokens || 0 },
    { name: 'Output', value: summary.totalEvalTokens || 0 },
  ].filter(d => d.value > 0)

  const speed = summary.totalTimeMs && summary.totalTokens ? Math.round(summary.totalTokens / (summary.totalTimeMs / 1000)) : '—'

  return (
    <div className="space-y-3">
      {/* Compact period selector */}
      <div className="flex items-center gap-1.5">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              period === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">Запросов</div>
          <div className="text-sm font-bold text-white">{summary.totalRequests?.toLocaleString() || '—'}</div>
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">Токенов</div>
          <div className="text-sm font-bold text-white">{formatNumber(summary.totalTokens)}</div>
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">Скорость</div>
          <div className="text-sm font-bold text-amber-400">{speed}<span className="text-[10px] text-gray-500 font-normal ml-0.5">т/с</span></div>
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">Среднее</div>
          <div className="text-sm font-bold text-white">{summary.avgTimeFormatted || '—'}</div>
        </div>
      </div>

      {/* Charts: tokens + requests side by side */}
      {byDay.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 mb-1">Токены</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '4px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="tokens" stroke="#A855F7" fill="url(#tokenGrad)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 mb-1">Запросов</div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '4px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="requests" stroke="#3B82F6" fill="url(#reqGrad)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Token breakdown bars */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Prompt</span>
            <span className="text-[10px] font-mono text-purple-400">{formatNumber(summary.totalPromptTokens)}</span>
          </div>
          {summary.totalTokens && (
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(summary.totalPromptTokens / summary.totalTokens) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Output</span>
            <span className="text-[10px] font-mono text-amber-400">{formatNumber(summary.totalEvalTokens)}</span>
          </div>
          {summary.totalTokens && (
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(summary.totalEvalTokens / summary.totalTokens) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Pie + recent table */}
      <div className="grid grid-cols-2 gap-2">
        {/* Pie */}
        {pieData.length > 1 && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2 flex items-center justify-between">
            <div className="text-[10px] text-gray-500 mb-1 w-full absolute">Распределение</div>
            <ResponsiveContainer width={100} height={80}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={35} paddingAngle={3} dataKey="value" stroke="none">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-0.5">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-[10px] text-gray-400">{item.name}</span>
                  <span className="text-[10px] font-mono text-gray-300">{Math.round((item.value / summary.totalTokens) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent requests table */}
        {recent.length > 0 && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-2 overflow-hidden">
            <div className="text-[10px] text-gray-500 mb-1">Последние запросы</div>
            <div className="overflow-auto max-h-32">
              <table className="w-full">
                <thead className="text-[10px] text-gray-500">
                  <tr>
                    <th className="text-left font-normal py-0.5">Слот</th>
                    <th className="text-right font-normal py-0.5">Prompt</th>
                    <th className="text-right font-normal py-0.5">Output</th>
                    <th className="text-right font-normal py-0.5">Всего</th>
                    <th className="text-right font-normal py-0.5">Время</th>
                    <th className="text-right font-normal py-0.5">т/с</th>
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {recent.map((r, i) => {
                    const tokens = r.totalTokens || r.promptTokens || 0
                    const time = r.totalTimeMs || 0
                    const speed = time > 0 ? Math.round(tokens / (time / 1000)) : 0
                    return (
                      <tr key={i} className="border-t border-gray-800/50">
                        <td className="py-0.5 text-gray-400">#{r.slotId}</td>
                        <td className="py-0.5 text-right text-purple-400">{r.promptTokens?.toLocaleString()}</td>
                        <td className="py-0.5 text-right text-amber-400">{r.evalTokens?.toLocaleString()}</td>
                        <td className="py-0.5 text-right text-white font-medium">{tokens.toLocaleString()}</td>
                        <td className="py-0.5 text-right text-gray-400">{time > 0 ? formatMs(time) : '—'}</td>
                        <td className="py-0.5 text-right text-gray-500">{speed}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
