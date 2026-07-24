export default function MainLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
      <div className="h-[46px] w-full animate-pulse rounded-2xl bg-surface-sunken" />
      <div className="h-4 w-28 animate-pulse rounded bg-surface-sunken" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-line">
            <div className="aspect-[4/3] w-full animate-pulse bg-surface-sunken" />
            <div className="flex flex-col gap-1.5 p-3">
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-sunken" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
