import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function MiniBar({ value, max = 100, color = 'blue' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  }
  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function MetricRow({ label, value, sub, bar, barColor, color, compact = false }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? 'py-0.5' : 'py-1.5'} border-b border-gray-800/50 last:border-b-0`}>
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono truncate ${color || 'text-gray-200'}`}>{value}</span>
          {sub && <span className="text-[10px] text-gray-600 shrink-0">{sub}</span>}
        </div>
        {bar !== undefined && <MiniBar value={bar} color={barColor} />}
      </div>
    </div>
  )
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
      LIVE
    </span>
  )
}

export default function Dashboard({ data, loading = false, wsStatus = 'connecting' }) {
  const isConnecting = wsStatus === 'connecting' || (wsStatus === 'disconnected' && !data)

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-600">
        <div className="text-2xl mb-2 animate-pulse">⏳</div>
        <p className="text-xs">Загрузка данных…</p>
      </div>
    )
  }

  const system = data.system || {}
  const gpu = data.gpu || {}
  const llama = data.llama || {}
  const service = data.service || {}

  const cpuPct = system.cpu?.usage || 0
  const ramPct = system.memory?.percent || 0
  const vramPct = gpu.memoryPercent || 0
  const gpuTemp = gpu.temperature || 0
  const diskPct = system.filesystem?.percent || 0

  return (
    <div className="space-y-3">
      {/* Compact header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-300">Мониторинг</h2>
          {wsStatus === 'connected' && <LiveBadge />}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <span>GPU: {gpu.name || '—'}</span>
          <span>CPU: {system.cpu?.brand || '—'}</span>
          <span>{llama.status ? `🟢 ${llama.status}` : '🔴 offline'}</span>
        </div>
      </div>

      {/* Top bar: key metrics */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">CPU</div>
          <div className="flex items-end gap-1">
            <span className="text-sm font-bold text-white">{cpuPct}%</span>
            <span className="text-[10px] text-gray-600 mb-0.5">{system.cpu?.speedMax ? `${system.cpu.speedMax}GHz` : ''}</span>
          </div>
          <MiniBar value={cpuPct} color="blue" />
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">RAM</div>
          <div className="flex items-end gap-1">
            <span className="text-sm font-bold text-white">{ramPct}%</span>
            <span className="text-[10px] text-gray-600 mb-0.5">
              {system.memory ? formatBytes(system.memory.used) : '—'}
            </span>
          </div>
          <MiniBar value={ramPct} color="purple" />
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">VRAM</div>
          <div className="flex items-end gap-1">
            <span className="text-sm font-bold text-white">{vramPct}%</span>
            <span className="text-[10px] text-gray-600 mb-0.5">
              {gpu ? formatBytes(gpu.memoryUsed) : '—'}
            </span>
          </div>
          <MiniBar value={vramPct} color="green" />
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-500 mb-0.5">TEMP</div>
          <div className="flex items-end gap-1">
            <span className={`text-sm font-bold ${gpuTemp > 80 ? 'text-red-400' : gpuTemp > 60 ? 'text-amber-400' : 'text-white'}`}>
              {gpuTemp}°C
            </span>
            <span className="text-[10px] text-gray-600 mb-0.5">
              {gpu.powerDraw ? `${gpu.powerDraw.toFixed(0)}W` : ''}
            </span>
          </div>
          <MiniBar value={gpuTemp} max={100} color={gpuTemp > 80 ? 'red' : gpuTemp > 60 ? 'amber' : 'green'} />
        </div>
      </div>

      {/* Middle: charts side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* VRAM history */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">GPU Memory</div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { t: 0, v: gpu.memoryUsed || 0 },
                ]}
              >
                <defs>
                  <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '6px', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#10B981"
                  strokeWidth={1.5}
                  fill="url(#gpuGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resources comparison */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">Resources</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 w-8">CPU</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${cpuPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{cpuPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 w-8">RAM</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${ramPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{ramPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 w-8">VRAM</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${vramPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{vramPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 w-8">DISK</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${diskPct > 90 ? 'bg-red-500' : diskPct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${diskPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{diskPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: details in two compact columns */}
      <div className="grid grid-cols-2 gap-2">
        {/* GPU details */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">GPU</div>
          <MetricRow label="VRAM" value={formatBytes(gpu.memoryUsed || 0)} sub={`/ ${formatBytes(gpu.memoryTotal || 0)}`} bar={vramPct} barColor="green" />
          <MetricRow label="Temp" value={`${gpuTemp}°C`} color={gpuTemp > 80 ? 'text-red-400' : 'text-white'} bar={gpuTemp} max={100} barColor={gpuTemp > 80 ? 'red' : gpuTemp > 60 ? 'amber' : 'green'} />
          <MetricRow label="Power" value={gpu.powerDraw ? `${gpu.powerDraw.toFixed(1)}W` : '—'} />
          <MetricRow label="Clock" value={gpu.clock ? `${gpu.clock} MHz` : '—'} />
          <MetricRow label="Fan" value={gpu.fanSpeed != null ? `${gpu.fanSpeed}%` : '—'} />
        </div>

        {/* Llama details */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Llama Server</div>
          <MetricRow label="Status" value={llama.status === 'running' ? '● running' : '○ stopped'} color={llama.status === 'running' ? 'text-emerald-400' : 'text-red-400'} />
          <MetricRow label="Service" value={service.active ? 'active' : 'inactive'} color={service.active ? 'text-emerald-400' : 'text-gray-400'} />
          <MetricRow label="Prompt" value={llama.metrics?.llama_prompt_eval_total ? `${llama.metrics.llama_prompt_eval_total.toLocaleString()}` : '—'} />
          <MetricRow label="Eval" value={llama.metrics?.llama_eval_total ? `${llama.metrics.llama_eval_total.toLocaleString()}` : '—'} />
          {llama.props && (
            <>
              <MetricRow label="Context" value={llama.props.default_generation_settings?.params?.n_ctx?.toString() || '—'} />
              <MetricRow label="Batch" value={llama.props.default_generation_settings?.params?.n_batch?.toString() || '—'} />
            </>
          )}
        </div>
      </div>

      {/* System details */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
        <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">System</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0">
          <MetricRow label="CPU" value={system.cpu?.physicalCores?.toString() || '—'} sub={`×${system.cpu?.cores || ''} threads`} />
          <MetricRow label="Load" value={system.load?.load1?.toFixed(2) || '—'} sub={system.load?.load5 && `${system.load.load5}/${system.load.load15}`} />
          <MetricRow label="RAM" value={system.memory ? formatBytes(system.memory.used) : '—'} sub={system.memory ? formatBytes(system.memory.total) : ''} />
          <MetricRow label="Disk" value={system.filesystem ? `${formatBytes(system.filesystem.used)} / ${formatBytes(system.filesystem.total)}` : '—'} />
        </div>
      </div>
    </div>
  )
}
