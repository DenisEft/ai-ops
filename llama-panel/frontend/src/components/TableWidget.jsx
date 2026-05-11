function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export default function TableWidget({ statsData, widget }) {
  const requests = statsData?.requests?.slice(0, 20) || []
  
  if (!requests.length) return (
    <div className="metric-card">
      <span className="text-xs font-semibold text-gray-300 mb-2 block">📋 {widget.label}</span>
      <div className="text-[10px] text-gray-500 text-center py-8">Нет данных</div>
    </div>
  )
  
  return (
    <div className="metric-card">
      <span className="text-xs font-semibold text-gray-300 mb-2 block">📋 {widget.label}</span>
      <div className="overflow-auto max-h-48">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Время</th>
              <th className="text-right">Prompt</th>
              <th className="text-right">Eval</th>
              <th className="text-right">Всего</th>
              <th className="text-right">Время</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r, i) => (
              <tr key={i}>
                <td className="text-gray-500">{r.timestamp || ''}</td>
                <td className="text-right text-blue-400 font-mono">{formatNum(r.promptTokens || 0)}</td>
                <td className="text-right text-purple-400 font-mono">{formatNum(r.evalTokens || 0)}</td>
                <td className="text-right text-white font-medium font-mono">{formatNum(r.totalTokens || 0)}</td>
                <td className="text-right text-gray-400 font-mono">
                  {r.totalTimeMs > 1000 ? `${(r.totalTimeMs / 1000).toFixed(1)}s` : `${r.totalTimeMs || 0}ms`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
