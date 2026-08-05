'use client';

import Link from 'next/link';

const ACTIONS = [
  { href: '/map', emoji: '🧭', label: '내 주변 찾기', tile: 'bg-blue-50' },
  { href: '/map', emoji: '🗺️', label: '지도에서 찾기', tile: 'bg-cyan-50' },
  { href: '/region', emoji: '📍', label: '지역별 찾기', tile: 'bg-emerald-50' },
  { href: '/search', emoji: '🏢', label: '회사별 찾기', tile: 'bg-indigo-50' },
  // hardNavigate:true - force-dynamic/loading.tsx/prefetch=false를 각각 시도했는데도
  // 운영에서 계속 재현됐다: 홈 진입 후 몇 초가 지나 페이지가 완전히 안정된 뒤 클릭해도
  // 이 라우트로의 클라이언트 사이드 RSC 이동 요청 자체가 net::ERR_ABORTED로 취소되고,
  // 그 뒤에 다른 요청이 이어지지 않아 빈 목록이 그대로 렌더된다(정확한 원인을
  // Next.js 라우터 내부까지는 규명하지 못했다). 반면 새로고침(F5)이나 URL 직접 이동
  // 같은 순수 브라우저 전체 페이지 이동은 매번 정확하게 동작했다 - 그래서 이 링크만
  // Next 클라이언트 라우터를 완전히 우회해 항상 전체 페이지 이동을 강제한다.
  { href: '/planner-market/search', emoji: '🧑‍💼', label: '설계사 찾기', tile: 'bg-violet-50', hardNavigate: true },
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
          prefetch={'hardNavigate' in action && action.hardNavigate ? false : undefined}
          onClick={
            'hardNavigate' in action && action.hardNavigate
              ? (e) => {
                  e.preventDefault();
                  window.location.href = action.href;
                }
              : undefined
          }
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
