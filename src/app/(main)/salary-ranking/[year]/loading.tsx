export default function SalaryRankingYearLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <div className="h-6 w-48 animate-pulse rounded bg-surface-sunken" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-surface-sunken" />
      </div>

      <div className="h-20 w-full animate-pulse rounded-2xl bg-surface-sunken" />

      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-surface-sunken" />
        ))}
      </div>
    </div>
  );
}
