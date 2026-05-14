function SkeletonCard({ rows = 3 }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-3 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-gray-800 rounded mb-2" />
      ))}
    </div>
  )
}

function SkeletonKPICard() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-700 rounded w-16" />
        <div className="h-6 bg-gray-700 rounded w-12" />
      </div>
      <div className="h-4 bg-gray-800 rounded w-1/2 mt-2" />
    </div>
  )
}

function SkeletonTabBar() {
  return (
    <div className="flex gap-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-8 bg-gray-700 rounded-lg w-20" />
      ))}
    </div>
  )
}

function SkeletonFull() {
  return (
    <div className="space-y-3">
      <SkeletonTabBar />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKPICard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={3} />
      </div>
    </div>
  )
}

export { SkeletonCard, SkeletonKPICard, SkeletonTabBar, SkeletonFull }
