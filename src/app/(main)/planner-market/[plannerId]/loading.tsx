export default function PlannerMarketDetailLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="h-3 w-40 animate-pulse rounded bg-surface-sunken" />
      <div className="flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-surface-sunken" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-sunken" />
          <div className="h-3 w-48 animate-pulse rounded bg-surface-sunken" />
        </div>
      </div>
      <div className="h-11 w-full animate-pulse rounded-2xl bg-surface-sunken" />
      <div className="h-32 w-full animate-pulse rounded-2xl bg-surface-sunken" />
      <div className="h-40 w-full animate-pulse rounded-2xl bg-surface-sunken" />
    </div>
  );
}
