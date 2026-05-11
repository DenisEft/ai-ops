import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !Array.isArray(payload) || !payload.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-[10px] shadow-xl">
      <div className="text-gray-400 mb-0.5 font-medium">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-white">{p.name}: {typeof p.value === 'number' ? Math.round(p.value) : p.value}</div>
      ))}
    </div>
  )
}

function ChartHeight({ h = 140 }) {
  return (
    <ResponsiveContainer width="100%" height={h}>
      {this.props.children}
    </ResponsiveContainer>
  )
}

const XAxisDef = <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
const YAxisDef = <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />

const TokensChart = ({ data, chartType }) => {
  if (!data?.length) return <div className="flex items-center justify-center h-[120px] text-[10px] text-gray-600">Нет данных</div>
  
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data}>
          <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
          <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="tokens" stroke="#8b5cf6" fill="url(#cg)" strokeWidth={1.5} name="Токены" />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
          <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="tokens" fill="#8b5cf6" radius={[3,3,0,0]} name="Токены" />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={1.5} name="Токены" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const RequestsChart = ({ data, chartType }) => {
  if (!data?.length) return <div className="flex items-center justify-center h-[120px] text-[10px] text-gray-600">Нет данных</div>
  
  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
          <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="requests" fill="#3b82f6" radius={[3,3,0,0]} name="Запросы" />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data}>
          <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
          <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="requests" stroke="#3b82f6" fill="url(#rg)" strokeWidth={1.5} name="Запросы" />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={1.5} name="Запросы" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const TPSChart = ({ data }) => {
  const byDay = Array.isArray(data?.byDay) ? data.byDay : []
  if (!byDay.length) return <div className="flex items-center justify-center h-[120px] text-[10px] text-gray-600">Нет данных</div>
  const chartData = byDay.map(d => ({
    date: String(d.date).slice(5),
    tps: (d.requests > 0 && d.timeMs > 0) ? Math.round(d.tokens / (d.timeMs / 1000)) : 0
  }))
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <XAxis dataKey="date" tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <YAxis tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="tps" stroke="#06b6d4" strokeWidth={1.5} name="TPS" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function ChartWidget({ metric, widget, statsData }) {
  const data = metric?.data
  if (!data && !statsData) return <WidgetSkeleton />
  const { chartType, id } = widget
  
  if (id === 'tokens') {
    const chartData = statsToChartData(statsData, 'tokens')
    return <TokensChart data={chartData} chartType={chartType} />
  }
  if (id === 'requests') {
    const chartData = statsToChartData(statsData, 'requests')
    return <RequestsChart data={chartData} chartType={chartType} />
  }
  if (id === 'tokens-per-sec') return <TPSChart data={statsData} />
  if (id === 'temperature') return <TempChart temp={data} />
  
  return <WidgetSkeleton />
}

function statsToChartData(statsData, field, fallback) {
  if (!statsData?.byDay || !Array.isArray(statsData.byDay)) return []
  return statsData.byDay.map(d => ({
    date: String(d.date).slice(5),
    [field]: d[field] ?? (fallback ?? 0)
  }))
}

function TempChart({ temp }) {
  const val = temp?.value ?? temp?.temp ?? temp ?? 0
  if (!val || isNaN(val)) return <div className="flex items-center justify-center h-[120px] text-[10px] text-gray-600">N/A</div>
  const data = [{ label: 'GPU', temp: val }]
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
        <YAxis domain={[0, 100]} tick={{fontSize:9,fill:'#4b5563'}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="temp" fill={val > 80 ? '#ef4444' : '#10b981'} radius={[3,3,0,0]} name="°C" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function WidgetSkeleton() {
  return (
    <div className="metric-card animate-pulse">
      <div className="h-3 bg-gray-800 rounded w-1/3 mb-2" />
      <div className="h-[120px] bg-gray-800 rounded" />
    </div>
  )
}
