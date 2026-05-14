import { memo } from 'react'
import KPICard from './KPICard'
import SectionCard from './SectionCard'

const STATUS_ICONS = {
  ok: '✅',
  warning: '⚠️',
  critical: '🔴',
  error: '❌',
  offline: '❌',
  unknown: '⚪',
}

const STATUS_COLORS = {
  ok: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  error: 'text-red-400',
  offline: 'text-red-400',
  unknown: 'text-gray-400',
}

function Overview({ data, loading, error, onRefresh }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Загрузка...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-3xl">⚠️</span>
        <span className="text-red-400 text-sm">{error}</span>
        <button onClick={onRefresh} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors">
          Повторить
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-3xl">🦙</span>
        <span className="text-gray-500 text-sm">Нет данных</span>
      </div>
    )
  }

  const { status, gauge, health, alerts, tokens } = data

  // Status bar
  const statusItems = [
    { label: 'WS', ok: status.websocket === 'connected' },
    { label: 'Llama', ok: status.llama === 'ok' },
    { label: 'OC', ok: status.openclaw === 'ok' },
    { label: 'Panel', ok: status.panel === 'ok' },
  ]

  // KPI data
  const cpuUsage = gauge?.cpu?.usage || 0
  const ramPercent = gauge?.memory?.usedPercent || 0
  const vramUsed = gauge?.gpu?.vramUsed || 0
  const vramTotal = gauge?.gpu?.vramTotal || 0
  const vramPercent = vramTotal > 0 ? Math.round((vramUsed / vramTotal) * 100) : 0
  const temp = gauge?.gpu?.temp || 0
  const llmTps = gauge?.llm?.tokensPerSecond || 0
  const llmQueue = gauge?.llm?.queueSize || 0
  const cpuTemp = gauge?.cpu?.temp || 0

  // KPI colors
  const cpuColor = cpuUsage >= 95 ? 'red' : cpuUsage >= 80 ? 'amber' : 'green'
  const ramColor = ramPercent >= 95 ? 'red' : ramPercent >= 85 ? 'amber' : 'green'
  const vramColor = vramPercent >= 95 ? 'red' : vramPercent >= 85 ? 'amber' : 'green'
  const tempColor = temp >= 85 ? 'red' : temp >= 70 ? 'amber' : 'green'

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        {statusItems.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className={s.ok ? 'text-gray-400' : 'text-red-400'}>{s.label}</span>
          </div>
        ))}
        <button onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">↻</button>
      </div>

      {/* KPI Cards 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard label="CPU" value={cpuUsage} unit="%" color={cpuColor} sub={`${gauge?.cpu?.cores || 0} ядер`} />
        <KPICard label="RAM" value={ramPercent} unit="%" color={ramColor} sub={gauge?.memory?.used || '—'} />
        <KPICard label="VRAM" value={vramPercent} unit="%" color={vramColor} sub={`${vramUsed}/${vramTotal} MB`} />
        <KPICard label="Temp" value={temp} unit="°C" color={tempColor} sub={gauge?.gpu?.powerDraw ? `${gauge.gpu.powerDraw}W` : undefined} />
      </div>

      {/* LLM info */}
      <SectionCard>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-gray-500">Токены/с</div>
            <div className="text-lg font-bold text-emerald-400">{llmTps > 0 ? llmTps.toFixed(1) : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Очередь</div>
            <div className="text-lg font-bold text-white">{llmQueue}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Декод.</div>
            <div className="text-lg font-bold text-blue-400">{gauge?.llm?.decoded ?? '—'}</div>
          </div>
        </div>
      </SectionCard>

      {/* Tokens */}
      {tokens && (
        <SectionCard title="Токены">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-[10px] text-gray-500">Llama</div>
              <div className="text-sm font-bold text-violet-400">{tokens.llama?.toLocaleString('ru-RU') ?? '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">OpenClaw</div>
              <div className="text-sm font-bold text-cyan-400">{tokens.openclaw?.toLocaleString('ru-RU') ?? '—'}</div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Health Check */}
      <SectionCard title="Health Check">
        <div className="space-y-1.5">
          {health?.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`text-sm ${STATUS_COLORS[h.status] || 'text-gray-400'}`}>
                  {STATUS_ICONS[h.status] || '⚪'}
                </span>
                <span className="text-gray-300">{h.service}</span>
              </div>
              <span className={`text-[10px] ${STATUS_COLORS[h.status] || 'text-gray-500'}`}>{h.detail || '—'}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Alerts */}
      {alerts?.length > 0 && (
        <SectionCard title="Алерты">
          <div className="space-y-1">
            {alerts.slice(-5).map((a, i) => (
              <div key={i} className={`text-xs flex items-start gap-1.5 ${
                a.level === 'critical' ? 'text-red-400' : a.level === 'warning' ? 'text-amber-400' : 'text-blue-400'
              }`}>
                <span className="text-gray-600 shrink-0">{a.time}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

export default memo(Overview)
