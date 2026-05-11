export default function StatusWidget({ metric, widget }) {
  const data = metric?.data
  if (!data) return <WidgetSkeleton />
  
  const services = Array.isArray(data.services) ? data.services : []
  
  if (services.length === 0) {
    return (
      <div className="metric-card">
        <span className="text-xs font-semibold text-gray-300 mb-2 block">🔧 {widget.label}</span>
        <div className="text-[10px] text-gray-500 text-center py-4">Нет данных</div>
      </div>
    )
  }
  
  return (
    <div className="metric-card">
      <span className="text-xs font-semibold text-gray-300 mb-2 block">🔧 {widget.label}</span>
      <div className="space-y-1.5">
        {services.map(svc => (
          <div key={svc.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'active' ? 'bg-emerald-400' : svc.status === 'inactive' || svc.status === 'dead' ? 'bg-red-400' : 'bg-amber-400'}`} />
              <span className="text-[10px] text-gray-300 font-mono">{svc.name}</span>
            </div>
            <span className={`text-[9px] font-medium ${
              svc.status === 'active' ? 'text-emerald-400' :
              svc.status === 'inactive' || svc.status === 'dead' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {svc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WidgetSkeleton() {
  return (
    <div className="metric-card animate-pulse">
      <div className="h-3 bg-gray-800 rounded w-1/3 mb-2" />
      <div className="space-y-2">
        <div className="h-2.5 bg-gray-800 rounded w-3/4" />
        <div className="h-2.5 bg-gray-800 rounded w-1/2" />
      </div>
    </div>
  )
}
