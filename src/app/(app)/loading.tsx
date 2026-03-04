export default function Loading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <div className="h-3 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
