function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-sunken ${className ?? ''}`} />;
}

function CardSkeleton() {
  return (
    <div className="w-[170px] shrink-0 overflow-hidden rounded-2xl border border-line sm:w-[190px]">
      <div className="flex items-center gap-2 p-3 pb-2">
        <Pulse className="h-9 w-9 shrink-0 rounded-full" />
        <Pulse className="h-2.5 w-16 rounded" />
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <Pulse className="h-3.5 w-3/4 rounded" />
        <Pulse className="h-5 w-full rounded-full" />
      </div>
    </div>
  );
}

/** 홈 화면 최초 로딩 스켈레톤 - 실제 레이아웃(등록CTA/통계/빠른메뉴/캐러셀)과
 * 같은 골격으로 만들어 데이터가 도착하는 순간 레이아웃이 튀지 않게 한다. */
export default function MainLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-6 pt-4">
      <Pulse className="h-[100px] w-full rounded-3xl" />

      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Pulse key={i} className="h-[62px] rounded-2xl" />
        ))}
      </div>

      <Pulse className="h-[52px] rounded-2xl" />

      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Pulse key={i} className="h-[104px] rounded-3xl" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Pulse className="h-4 w-24 rounded" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Pulse className="h-4 w-24 rounded" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
