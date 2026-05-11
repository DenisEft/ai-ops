function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (!isFinite(bytes)) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function BarMetric({ label, value, max, color, unit, info }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-[10px] text-gray-300 font-mono">
          {value}{unit && <span className="text-gray-500">{unit}</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              color === 'red' ? 'bg-red-500' :
              color === 'amber' ? 'bg-amber-500' :
              color === 'green' ? 'bg-emerald-500' :
              color === 'purple' ? 'bg-purple-500' :
              color === 'cyan' ? 'bg-cyan-500' :
              color === 'blue' ? 'bg-blue-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400 font-mono w-10 text-right">{Math.round(pct)}%</span>
      </div>
      {info && <div className="text-[9px] text-gray-600 mt-1">{info}</div>}
    </div>
  )
}

export default function GaugeWidget({ metric, widget }) {
  const data = metric?.data
  if (!data) return <WidgetSkeleton />

  const { id, label } = widget
  const num = (v) => { const n = Number(v); return isNaN(n) || !isFinite(n) ? null : n }

  switch (id) {
    case 'cpu': {
      const usage = num(data.cpuUsage)
      const temp = num(data.cpuTemp)
      return (
        <div className="metric-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">⚡ {data.cpuBrand || label}</span>
            <span className="text-[10px] text-gray-500">{data.cpuCores} cores</span>
          </div>
          <BarMetric
            label="Usage"
            value={usage ?? 0}
            max={100}
            color={(usage !== null && usage > 80) ? 'red' : (usage !== null && usage > 60) ? 'amber' : 'green'}
            unit="%"
          />
          <BarMetric
            label="Temp"
            value={temp ?? 0}
            max={100}
            color={(temp !== null && temp > 80) ? 'red' : (temp !== null && temp > 60) ? 'amber' : 'green'}
            unit="°C"
          />
        </div>
      )
    }
    case 'memory': {
      const pct = num(data.percent)
      const used = num(data.used)
      const free = num(data.available)
      return (
        <div className="metric-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">🧠 {label}</span>
            <span className="text-[10px] text-gray-500">{formatBytes(num(data.total) || 0)}</span>
          </div>
          <BarMetric
            label="Used"
            value={used ?? 0}
            max={num(data.total) || 1}
            color={(pct !== null && pct > 90) ? 'red' : (pct !== null && pct > 70) ? 'amber' : 'blue'}
            unit={formatBytes(num(data.total) || 0)}
            info={`${formatBytes(used || 0)} / ${formatBytes((num(data.total) || 0))}`}
          />
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>Free: {formatBytes(free || 0)}</span>
          </div>
        </div>
      )
    }
    case 'gpu': {
      const vramUsed = num(data.vramUsed) ?? 0
      const vramTotal = num(data.vramTotal) ?? 0
      const gpuTemp = num(data.gpuTemp) ?? 0
      const gpuPower = num(data.gpuPower) ?? 0
      return (
        <div className="metric-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">🎮 {data.gpuModel || label}</span>
          </div>
          <BarMetric
            label="VRAM"
            value={vramUsed}
            max={vramTotal}
            color="purple"
            unit="MB"
            info={`${vramTotal > 0 ? `${vramUsed}/${vramTotal} MB` : '—'}`}
          />
          <BarMetric
            label="Temp"
            value={gpuTemp}
            max={100}
            color={gpuTemp > 80 ? 'red' : 'green'}
            unit="°C"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Power: {gpuPower}W</span>
          </div>
        </div>
      )
    }
    case 'disk': {
      const pct = num(data.percent)
      return (
        <div className="metric-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">💾 {label}</span>
          </div>
          <BarMetric
            label="Used"
            value={num(data.used) ?? 0}
            max={num(data.total) || 1}
            color={(pct !== null && pct > 90) ? 'red' : (pct !== null && pct > 70) ? 'amber' : 'cyan'}
            unit="B"
            info={`${formatBytes(num(data.used) || 0)} / ${formatBytes(num(data.total) || 0)}`}
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Free: {formatBytes(num(data.available) || 0)}</span>
          </div>
        </div>
      )
    }
    case 'load': {
      const l1 = num(data.load1) ?? 0
      const l5 = num(data.load5) ?? 0
      const l15 = num(data.load15) ?? 0
      const cores = num(data.cpuCores) || 4
      const maxLoad = cores * 2
      return (
        <div className="metric-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">📊 Load Average</span>
            <span className="text-[10px] text-gray-500">{cores} cores</span>
          </div>
          <BarMetric
            label="1m"
            value={l1}
            max={maxLoad}
            color={l1 > maxLoad * 0.7 ? 'red' : l1 > maxLoad * 0.5 ? 'amber' : 'green'}
            unit=""
            info={l1.toFixed(2)}
          />
          <BarMetric
            label="5m"
            value={l5}
            max={maxLoad}
            color={l5 > maxLoad * 0.7 ? 'red' : l5 > maxLoad * 0.5 ? 'amber' : 'blue'}
            unit=""
            info={l5.toFixed(2)}
          />
          <BarMetric
            label="15m"
            value={l15}
            max={maxLoad}
            color={l15 > maxLoad * 0.7 ? 'amber' : 'cyan'}
            unit=""
            info={l15.toFixed(2)}
          />
        </div>
      )
    }
    case 'gpu-power': {
      const power = num(data.gpuPower) ?? 0
      return (
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">⚡ Power</span>
            <span className="text-[10px] text-gray-300 font-mono">{power}W</span>
          </div>
          <BarMetric
            label="Power"
            value={power}
            max={400}
            color="amber"
            unit="W"
          />
        </div>
      )
    }
    case 'service-status':
      return (
        <div className="metric-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">🔧 Services</span>
          </div>
          {Object.entries(data.services || {}).map(([name, svc]) => (
            <div key={name} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${svc.active ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                <span className="text-gray-300 font-mono">{name}</span>
              </div>
              <span className={`text-[9px] ${svc.active ? 'text-emerald-400' : 'text-gray-600'}`}>
                {svc.active ? 'running' : 'offline'}
              </span>
            </div>
          ))}
        </div>
      )
    default:
      return <WidgetSkeleton />
  }
}

function WidgetSkeleton() {
  return (
    <div className="metric-card animate-pulse space-y-2">
      <div className="h-3 bg-gray-800 rounded w-1/3" />
      <div className="h-2 bg-gray-800 rounded-full" />
      <div className="h-2 bg-gray-800 rounded-full" />
    </div>
  )
}
