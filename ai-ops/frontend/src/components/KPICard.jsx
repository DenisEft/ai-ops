import { memo } from 'react'

const COLORS = {
  green:  { bg: 'bg-emerald-500/20',  border: 'border-emerald-500/30', text: 'text-emerald-400',  bar: 'bg-emerald-500' },
  amber:  { bg: 'bg-amber-500/20',    border: 'border-amber-500/30',  text: 'text-amber-400',   bar: 'bg-amber-500' },
  red:    { bg: 'bg-red-500/20',      border: 'border-red-500/30',    text: 'text-red-400',     bar: 'bg-red-500' },
  blue:   { bg: 'bg-blue-500/20',     border: 'border-blue-500/30',   text: 'text-blue-400',    bar: 'bg-blue-500' },
  gray:   { bg: 'bg-gray-500/20',     border: 'border-gray-500/30',   text: 'text-gray-400',    bar: 'bg-gray-500' },
}

function KPICard({ label, value, unit, color = 'green', sub, size = 'md' }) {
  const c = COLORS[color] || COLORS.green
  const dim = size === 'lg' ? 'text-2xl' : 'text-lg'
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]'

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-2.5`}>
      <div className={`${labelSize} text-gray-400 mb-0.5 font-medium`}>{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`${dim} font-bold text-white leading-none`}>{value}</span>
        {unit && <span className="text-[10px] text-gray-500">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default memo(KPICard)
