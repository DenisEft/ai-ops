import { memo } from 'react'

function SectionCard({ title, action, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-gray-800 bg-gray-900/80 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          {title && <h3 className="text-xs font-medium text-gray-400">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-3 pb-2.5">{children}</div>
    </div>
  )
}

export default memo(SectionCard)
