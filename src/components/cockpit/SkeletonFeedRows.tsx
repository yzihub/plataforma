export default function SkeletonFeedRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-5 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
