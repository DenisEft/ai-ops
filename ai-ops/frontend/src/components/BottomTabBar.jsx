import { memo } from 'react'

const TABS = [
  { id: 'overview',  label: 'Обзор',  icon: '🏠' },
  { id: 'metrics',   label: 'Метрики', icon: '📊' },
  { id: 'management',label: 'Управление', icon: '🔧' },
  { id: 'settings',  label: 'Настройки', icon: '⚙️' },
]

function BottomTabBar({ activeTab, onTabChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm z-50 safe-area-bottom">
      <div className="flex items-center justify-around max-w-7xl mx-auto">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[44px] min-w-[44px]"
            >
              <span className={`text-lg transition-transform ${active ? 'scale-110' : 'opacity-50'}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] mt-0.5 transition-colors ${
                active ? 'text-blue-400 font-medium' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(BottomTabBar)
