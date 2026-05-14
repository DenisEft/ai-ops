import { useState } from 'react'
/* eslint-disable no-unused-vars */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !Array.isArray(payload) || !payload.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-[9px] shadow-xl">
      <div className="text-gray-400 mb-0.5 font-medium">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-white">{p.name}: {typeof p.value === 'number' ? Math.round(p.value) : p.value}</div>
      ))}
    </div>
  )
}

export default function Stats({ data, period: parentPeriod, setPeriod: parentSetPeriod }) {
  const [period, setPeriod] = useState(parentPeriod || '7d')
  
  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-gray-500 text-xs">Нет данных</p>
        </div>
      </div>
    )
  }
  
  const safeArray = (val) => Array.isArray(val) ? val : []
  const safeObj = (val) => val && typeof val === 'object' && !Array.isArray(val) ? val : {}
  
  const byDay = safeArray(data.byDay)
  const requests = safeArray(data.requests)
  const summary = safeObj(data.summary)
  
  const pieData = data.summary && [
    { name: 'Prompt', value: summary.totalPromptTokens || 0 },
    { name: 'Output', value: summary.totalEvalTokens || 0 },
  ].filter(d => d.value > 0)
  
  const chartData = byDay.map(d => ({
    name: String(d.date || '').slice(5),
    tokens: Number(d.tokens) || 0,
    prompt: Number(d.promptTokens) || 0,
    eval: Number(d.evalTokens) || 0,
    requests: Number(d.requests) || 0,
    tps: d.timeMs && Number(d.timeMs) > 0 ? Math.round(Number(d.tokens || 0) / (Number(d.timeMs) / 1000)) : 0,
  }))
  
  const totalTokens = summary.totalTokens || 0
  const totalRequests = summary.totalRequests || 0
  const avgTPS = summary.avgTPS || 0
  const avgTimeMs = summary.avgTimeMs || 0

  if (!byDay.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-gray-500 text-xs">Нет данных за выбранный период</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Period selector */}
      <div className="flex gap-1">
        {['1d', '7d', '30d'].map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); if (parentSetPeriod) parentSetPeriod(p) }}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              period === p ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        <div className="kpi-card">
          <div className="kpi-label">Запросов</div>
          <div className="kpi-value text-blue-400">{formatNum(totalRequests)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Токенов</div>
          <div className="kpi-value text-purple-400">{formatNum(totalTokens)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">TPS сред</div>
          <div className="kpi-value text-cyan-400">{avgTPS}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Время сред</div>
          <div className="kpi-value text-purple-300">{avgTimeMs > 0 ? `${(avgTimeMs / 1000).toFixed(1)}s` : '—'}</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        <div className="chart-container">
          <span className="text-[10px] font-semibold text-gray-300 mb-1 block">🔥 Токены</span>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tokensGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
              <XAxis dataKey="name" tick={{fontSize:8,fill:'#4b5563'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:8,fill:'#4b5563'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="tokens" stroke="#8b5cf6" fill="url(#tokensGrad)" strokeWidth={1.5} name="Всего" />
              <Area type="monotone" dataKey="prompt" stroke="#3b82f6" fill="none" strokeWidth={1.5} name="Prompt" />
              <Area type="monotone" dataKey="eval" stroke="#ec4899" fill="none" strokeWidth={1.5} name="Output" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <span className="text-[10px] font-semibold text-gray-300 mb-1 block">📬 Запросы</span>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
              <XAxis dataKey="name" tick={{fontSize:8,fill:'#4b5563'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:8,fill:'#4b5563'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="requests" fill="#3b82f6" radius={[3,3,0,0]} name="Запросы" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TPS + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        <div className="chart-container">
          <span className="text-[10px] font-semibold text-gray-300 mb-1 block">⚡ Ток/сек</span>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
              <XAxis dataKey="name" tick={{fontSize:8,fill:'#4b5563'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:8,fill:'#4b5563'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="tps" stroke="#06b6d4" strokeWidth={1.5} name="TPS" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <span className="text-[10px] font-semibold text-gray-300 mb-1 block">🥧 Распределение</span>
          {pieData && pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-[9px] text-gray-600">Нет данных</div>
          )}
        </div>
      </div>

      {/* Recent requests table */}
      <div className="metric-card">
        <span className="text-[10px] font-semibold text-gray-300 mb-1 block">📋 Последние запросы</span>
        {requests.length > 0 ? (
          <div className="overflow-auto max-h-40">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th className="text-right">Prompt</th>
                  <th className="text-right">Eval</th>
                  <th className="text-right">Всего</th>
                  <th className="text-right">Время</th>
                  <th className="text-right">TPS</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td className="text-gray-500">{r.timestamp?.slice(11, 19) || ''}</td>
                    <td className="text-right text-blue-400 font-mono">{formatNum(r.promptTokens || 0)}</td>
                    <td className="text-right text-purple-400 font-mono">{formatNum(r.evalTokens || 0)}</td>
                    <td className="text-right text-white font-medium font-mono">{formatNum(r.totalTokens || 0)}</td>
                    <td className="text-right text-gray-400 font-mono">
                      {r.totalTimeMs > 1000 ? `${(r.totalTimeMs / 1000).toFixed(1)}s` : `${r.totalTimeMs || 0}ms`}
                    </td>
                    <td className="text-right text-cyan-400 font-mono">
                      {r.timeMs > 0 ? Math.round((r.totalTokens || 0) / (r.timeMs / 1000)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-gray-500">Нет данных</div>
        )}
      </div>
    </div>
  )
}
