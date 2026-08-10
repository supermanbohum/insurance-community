'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Menu,
  X,
  MapPin,
  Building2,
  Flame,
  Sparkles,
  Users,
  Megaphone,
  ExternalLink,
  MessageCircle,
  Search,
  UserPlus,
  Ticket,
  Edit3,
  Award,
  TrendingUp,
} from 'lucide-react';
import { SearchCombobox } from '@/components/search/SearchCombobox';
import { BrandMark } from '@/components/brand/BrandMark';
import { AnimatedHeaderBrandMark } from '@/components/brand/AnimatedHeaderBrandMark';
import { GlobalShareButton } from '@/components/shared/GlobalShareButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { PLANNER_MARKET_LABEL } from '@/lib/config/labels';

// 기존 "인증" 그룹(우리동네 TOP설계사, planner_certifications 기반)은 메뉴에서 제거했다 -
// DB/RPC/구독(/admin/planners, /partner/planners)은 전혀 건드리지 않았고 URL 직접 접근은
// 계속 가능하다. 완전히 새로운 TOP 설계사 인증 시스템(top_designer_*)은 아래 "TOP 설계사 ·
// 연봉랭킹" 그룹으로 추가됐고(오너 지시 2026-08-09로 설계사마켓과 별개 스키마로 분리),
// "리크루팅" 그룹(설계사마켓)과는 서로를 참조하지 않는다.
const MENU_GROUPS = [
  {
    label: '자주 찾는 메뉴',
    items: [
      { href: '/region', label: '지역별', icon: MapPin, tile: 'bg-blue-50 text-blue-600' },
      // 세 항목이 전부 /ga(→/search 리다이렉트)로 가서 동일한 화면이었다(W-041) - 홈
      // 캐러셀이 이미 쓰는 정렬 파라미터(/search?sort=views·newest)에 맞춰 실제로
      // 다른 결과를 보여주도록 분리한다.
      { href: '/search', label: 'GA별', icon: Building2, tile: 'bg-indigo-50 text-indigo-600' },
      { href: '/search?sort=views', label: '인기 GA — 조회수 순', icon: Flame, tile: 'bg-rose-50 text-rose-600' },
      // "인기 GA"와 라벨이 한 글자 차이라(CTO 지적) 기준을 라벨에 직접 명시해 구분한다.
      // 조회수 기준(인기)과 TOP 인증 점수 기준(우수)은 서로 다른 랭킹이고 둘 다 유지된다
      // (오너 지시, 2026-08-10 - "우수GA랑 인기GA 2개 있는 것도 좋을듯"). 콘텐츠팀
      // 확정문안 - "인증"이 아니라 "점수"를 상위어로 쓴 이유: 0088부터 미제출자 1점도
      // 점수에 섞여서 "인증 합산"이라고만 쓰면 부정확해진다.
      { href: '/ga-ranking', label: '우수 GA — 소속 설계사 점수 순', icon: Award, tile: 'bg-amber-50 text-amber-600' },
      { href: '/search?sort=newest', label: '신규 GA', icon: Sparkles, tile: 'bg-amber-50 text-amber-600' },
      // PC(lg 이상)에서는 우측에 채팅 패널이 항상 떠 있어 이 메뉴 항목이 중복이라 숨긴다.
      { href: '/chat', label: '실시간 채팅', icon: MessageCircle, tile: 'bg-brand-50 text-brand-600', hideOnDesktop: true },
    ],
  },
  {
    // 설계사 마켓(열람권)/지점 광고 - TOP설계사(아래 "TOP 설계사 · 연봉랭킹" 그룹)와는 완전히 별개 시스템이다.
    label: '리크루팅',
    items: [
      // 설계사 마켓 3줄(찾기/등록/수정)을 1줄로 통합했다(오너 지시, 2026-08-10) - 등록/수정
      // 진입점은 /planner-market/search 페이지 상단 버튼 2개로 옮겼다. 라벨 문자열은
      // PLANNER_MARKET_LABEL 한 곳에서만 관리한다(표기 변경 시 한 줄로 끝나도록).
      // hardNavigate:true - QuickMenuGrid.tsx와 동일한 이유(라우트 참고). Next 클라이언트
      // 라우터를 우회해 항상 전체 페이지 이동을 강제한다.
      { href: '/planner-market/search', label: PLANNER_MARKET_LABEL, icon: Search, tile: 'bg-emerald-50 text-emerald-600', hardNavigate: true },
      { href: '/partner/register', label: '우리 지점 등록하기', icon: MapPin, tile: 'bg-blue-50 text-blue-600' },
      { href: '/partner/branches', label: '우리 지점 수정하기', icon: Edit3, tile: 'bg-blue-50 text-blue-600' },
      // ③ ⓑ(오너 지시, 2026-08-10) - 지점 등록/수정과 짝을 이루는 설계사 등록/수정.
      // 지점 연결이 필수라는 게 위 설계사Market과의 결정적 차이다.
      { href: '/branch-planner-register', label: '우리지점 설계사 등록하기', icon: UserPlus, tile: 'bg-violet-50 text-violet-600' },
      { href: '/branch-planner/edit', label: '우리지점 설계사 수정하기', icon: Edit3, tile: 'bg-violet-50 text-violet-600' },
      { href: '/partner/ad-products', label: '광고상품', icon: Megaphone, tile: 'bg-rose-50 text-rose-600' },
      { href: '/planner-market/purchase', label: '구매센터', icon: Ticket, tile: 'bg-amber-50 text-amber-600' },
    ],
  },
  {
    // top_designer_*/salary_ranking_* 완전 신규 시스템 - "리크루팅" 그룹(설계사마켓)이나
    // planner_certifications(고소득 설계사, Legacy)와 무관하다.
    label: 'TOP 설계사 · 연봉랭킹',
    items: [
      // 예전엔 목록(/top-designer)으로 갔지만, 오너 지시로 등록 진입점 우선 노출로
      // 바꿨다(2026-08-10) - 목록은 홈 "🏆 TOP 설계사 랭킹" 더보기로 계속 접근 가능하다.
      { href: '/top-designer/apply', label: 'TOP설계사 등록하기', icon: Award, tile: 'bg-amber-50 text-amber-600' },
      { href: '/salary-ranking', label: '전국 설계사 연봉 랭킹', icon: TrendingUp, tile: 'bg-rose-50 text-rose-600' },
    ],
  },
  {
    label: '커뮤니티',
    items: [
      { href: '/community', label: '보험맵', icon: Users, tile: 'bg-cyan-50 text-cyan-600', external: true },
      { href: '/board/notice', label: '공지사항', icon: Megaphone, tile: 'bg-slate-100 text-slate-600' },
    ],
  },
];

export function BohomMapHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const openMenu = () => setMenuOpen(true);
    window.addEventListener('open-main-menu', openMenu);
    return () => window.removeEventListener('open-main-menu', openMenu);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 shadow-header backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-surface-sunken active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-1.5">
            <AnimatedHeaderBrandMark />
          </Link>
          <div className="relative ml-1 flex-1">
            <SearchCombobox
              placeholder="지역, GA명, 지점명 검색"
              iconClassName="left-3.5"
              inputClassName="w-full rounded-full border border-transparent bg-surface-sunken py-2.5 pl-9 pr-3 text-base text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:shadow-card"
            />
          </div>
          {user ? (
            <Link
              href="/my"
              aria-label="마이페이지"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-xs font-bold text-brand-600"
            >
              {user.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImage} alt={user.nickname} className="h-full w-full object-cover" />
              ) : (
                user.nickname.slice(0, 1)
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className={cn(
                'shrink-0 rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken'
              )}
            >
              로그인
            </Link>
          )}
        </div>
      </header>

      {menuOpen &&
        createPortal(
          <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="메뉴 닫기"
              className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col overflow-y-auto bg-white p-5 shadow-2xl duration-300 animate-in slide-in-from-left">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                    <BrandMark className="h-4 w-4" />
                  </span>
                  <span className="text-base font-extrabold text-ink">보험맵</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-sunken"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <GlobalShareButton variant="menu" onClick={() => setMenuOpen(false)} />
              <nav className="mt-1 flex flex-col gap-6">
                {MENU_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{group.label}</p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={(e) => {
                            setMenuOpen(false);
                            if ('hardNavigate' in item && item.hardNavigate) {
                              e.preventDefault();
                              window.location.href = item.href;
                            }
                          }}
                          prefetch={'hardNavigate' in item && item.hardNavigate ? false : undefined}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink',
                            'hideOnDesktop' in item && item.hideOnDesktop && 'lg:hidden'
                          )}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tile}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {item.label}
                          {'external' in item && item.external && <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
