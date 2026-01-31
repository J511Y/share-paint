export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <div className="aspect-square animate-pulse bg-gray-200" />
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
