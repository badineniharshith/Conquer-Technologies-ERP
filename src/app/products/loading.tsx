export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Header Banner Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="h-6 w-64 bg-stone-200 rounded-lg" />
        <div className="h-4 w-96 bg-stone-100 rounded-md" />
      </div>

      {/* Filter Panel Skeleton */}
      <div className="bg-white p-4 border border-stone-200 rounded-xl space-y-4 shadow-sm">
        <div className="h-10 w-full bg-stone-100 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-9 bg-stone-100 rounded-xl" />
          <div className="h-9 bg-stone-100 rounded-xl" />
          <div className="h-9 bg-stone-100 rounded-xl" />
          <div className="h-9 bg-stone-100 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="h-10 bg-stone-100 rounded-xl w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-stone-50 rounded-xl w-full flex items-center justify-between px-4 space-x-4">
            <div className="h-4 w-28 bg-stone-200 rounded" />
            <div className="h-4 w-48 bg-stone-200 rounded" />
            <div className="h-4 w-24 bg-stone-100 rounded" />
            <div className="h-4 w-32 bg-stone-100 rounded" />
            <div className="h-4 w-20 bg-stone-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
