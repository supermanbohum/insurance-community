import Link from 'next/link';

const ACTIONS = [
  { href: '/map', emoji: '🧭', label: '내 주변 찾기', tile: 'bg-blue-50' },
  { href: '/map', emoji: '🗺️', label: '지도에서 찾기', tile: 'bg-cyan-50' },
  { href: '/region', emoji: '📍', label: '지역별 찾기', tile: 'bg-emerald-50' },
  { href: '/search', emoji: '🏢', label: '회사별 찾기', tile: 'bg-indigo-50' },
  // prefetch:false - loading.tsx를 추가한 뒤에도 홈 진입 즉시 백그라운드로 실행되는
  // 자동 프리페치가 이 라우트의 RSC 응답을 캐시해 첫 클릭에는 빈 목록이 보이고
  // 새로고침해야만 정상 표시되는 문제가 운영에서 계속 재현됐다(원인이 완전히
  // 규명되지 않았지만 프리페치 자체를 끄면 항상 실제 이동 시점에 새로 가져와
  // 확실히 해결된다 - 매 이동마다 한 번 더 요청이 나가는 정도의 비용은 감수할
  // 가치가 있다). 다른 진입점(BohomMapHeader 햄버거 메뉴)에도 동일하게 적용했다.
  { href: '/planner-market/search', emoji: '🧑‍💼', label: '설계사 찾기', tile: 'bg-violet-50', prefetch: false },
];

/** 홈 화면 진입점을 이 5개로 단순화한다 - 지도 미리보기/지역별·회사별/설계사
 * 바로가기 섹션은 없애고, 그 진입 기능을 전부 여기로 모았다. */
export function QuickMenuGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          prefetch={'prefetch' in action ? action.prefetch : undefined}
          className={`group flex flex-col items-center gap-2.5 rounded-3xl border border-line py-6 text-center shadow-card transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-card-hover active:scale-[0.97] ${action.tile}`}
        >
          <span className="text-[32px] leading-none transition-transform duration-200 ease-out group-hover:-translate-y-[2px]">
            {action.emoji}
          </span>
          <span className="text-[13px] font-bold leading-tight text-ink-soft">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
