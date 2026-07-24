export default function MapLoading() {
  return (
    <div className="flex h-[calc(100dvh-57px-76px)] flex-col lg:h-[calc(100dvh-57px)]">
      <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="h-10 flex-1 animate-pulse rounded-full bg-surface-sunken" />
        <div className="h-10 w-16 shrink-0 animate-pulse rounded-full bg-surface-sunken" />
      </div>
      <div className="flex-1 animate-pulse bg-surface-sunken" />
    </div>
  );
}
