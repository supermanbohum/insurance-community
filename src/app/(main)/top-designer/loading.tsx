export default function TopDesignerLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <div className="h-6 w-32 animate-pulse rounded bg-surface-sunken" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface-sunken" />
      </div>

      <div className="h-40 w-full animate-pulse rounded-2xl bg-surface-sunken" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
            <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-surface-sunken" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-sunken" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
