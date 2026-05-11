const CHART_TYPES = {
  bar: '📊 Столбцы',
  line: '📈 Линия',
  area: '📉 Область',
}

export default function WidgetSettings({ widgets, onToggle, onSize, onChartType, onReorder, onReset, isOpen, onClose }) {
  if (!isOpen) return null
  
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 w-80 max-h-[80vh] bg-gray-900 border border-gray-800 rounded-xl z-50 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">⚙️ Виджеты</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm leading-none">&times;</button>
        </div>
        
        {/* Body */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          {(Array.isArray(widgets) ? widgets : []).map((w, idx) => (
            <div key={w.id} className={`border rounded-lg transition-all ${
              w.enabled 
                ? 'border-gray-700/60 bg-gray-900/50' 
                : 'border-gray-800/40 bg-gray-900/20 opacity-50'
            }`}>
              {/* Toggle row */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onReorder(idx, Math.max(0, idx - 1))} className="text-gray-600 hover:text-gray-300 text-xs leading-none px-0.5">↑</button>
                  <button onClick={() => onReorder(idx, Math.min(widgets.length - 1, idx + 1))} className="text-gray-600 hover:text-gray-300 text-xs leading-none px-0.5">↓</button>
                  <span className="text-xs font-medium text-gray-200">{w.label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={w.enabled} onChange={() => onToggle(w.id)} className="sr-only peer" />
                  <div className="w-7 h-3.5 bg-gray-700 peer-checked:bg-emerald-500 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-3.5" />
                </label>
              </div>
              
              {/* Controls */}
              {w.enabled && (
                <div className="flex gap-1.5 px-3 pb-2">
                  <select value={w.size} onChange={(e) => onSize(w.id, e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-[10px] text-gray-300">
                    <option value="s">S</option>
                    <option value="m">M</option>
                    <option value="l">L</option>
                  </select>
                  {w.type === 'chart' && (
                    <select value={w.chartType} onChange={(e) => onChartType(w.id, e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-[10px] text-gray-300">
                      {Object.entries(CHART_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          ))}
          
          <button onClick={onReset} className="w-full mt-2 py-1.5 text-[10px] text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg transition-colors">
            🔄 Сбросить
          </button>
        </div>
      </div>
    </>
  )
}
