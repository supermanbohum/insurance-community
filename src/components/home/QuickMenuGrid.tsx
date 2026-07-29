import Link from 'next/link';

const ACTIONS = [
  { href: '/map', emoji: '🧭', label: '내 주변 찾기', tile: 'bg-blue-50' },
  { href: '/map', emoji: '🗺️', label: '지도에서 찾기', tile: 'bg-cyan-50' },
  { href: '/region', emoji: '📍', label: '지역별 찾기', tile: 'bg-emerald-50' },
  { href: '/search', emoji: '🏢', label: '회사별 찾기', tile: 'bg-indigo-50' },
];

/** 홈 화면 진입점을 이 4개로 단순화한다 - 지도 미리보기/지역별·회사별 바로가기
 * 섹션은 없애고, 그 진입 기능을 전부 여기로 모았다. */
export function QuickMenuGrid() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
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
