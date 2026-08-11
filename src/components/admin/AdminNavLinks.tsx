'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  PhoneCall,
  Briefcase,
  ClipboardCheck,
  LayoutTemplate,
  Award,
  CreditCard,
  UserCog,
  PartyPopper,
  Users2,
  Megaphone,
  GalleryHorizontal,
  Ticket,
  Footprints,
  MessageSquareText,
  History,
  TrendingUp,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** 사이드바 nav 배지용 승인대기 카운트 - GA/지점(신규등록)/설계사 3종. */
export interface AdminNavBadges {
  ga: number;
  branchCreate: number;
  planner: number;
  topDesigner: number;
  salaryRanking: number;
}

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; badgeKey?: keyof AdminNavBadges }[] = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/ga', label: 'GA 관리', icon: Building2, badgeKey: 'ga' },
  { href: '/admin/branches', label: '지점 관리', icon: MapPin },
  // ⑪ - 지도에만 뜨는 미등록 지점의 표시 중단 처리. 팝업이 "바로 내려드립니다"라고
  // 약속하므로 운영팀이 즉시 찾아갈 수 있어야 한다(지점 관리 바로 아래에 둔다).
  { href: '/admin/map-pois', label: '지도 미등록 지점', icon: MapPin },
  { href: '/admin/change-requests', label: '변경 요청', icon: ClipboardCheck, badgeKey: 'branchCreate' },
  { href: '/admin/planners', label: '고소득 설계사 (Legacy)', icon: Award },
  { href: '/admin/planner-market', label: '설계사 마켓', icon: Users2, badgeKey: 'planner' },
  { href: '/admin/planner-market/credits', label: '열람권 관리', icon: Ticket },
  { href: '/admin/top-designer', label: 'TOP 설계사 인증', icon: Award, badgeKey: 'topDesigner' },
  { href: '/admin/salary-ranking', label: '연봉 랭킹', icon: TrendingUp, badgeKey: 'salaryRanking' },
  { href: '/admin/ad-products', label: '광고 관리', icon: Megaphone },
  { href: '/admin/ga-change-requests', label: 'GA 변경 요청', icon: UserCog },
  { href: '/admin/billing', label: '결제 관리', icon: CreditCard },
  { href: '/admin/inquiries', label: '문의 관리', icon: PhoneCall },
  { href: '/admin/recruits', label: '채용 관리', icon: Briefcase },
  { href: '/admin/visitors', label: '방문자 관리', icon: Footprints },
  { href: '/admin/community', label: '커뮤니티 관리', icon: MessageSquareText },
  { href: '/admin/design/home', label: '디자인 편집', icon: LayoutTemplate },
  { href: '/admin/event-popup', label: '이벤트 팝업', icon: PartyPopper },
  { href: '/admin/home-banner', label: '홈 오픈 배너', icon: Megaphone },
  { href: '/admin/banners', label: '배너 관리', icon: GalleryHorizontal },
  { href: '/admin/audit-log', label: '작업 로그', icon: History },
  { href: '/admin/push-test', label: '푸시 테스트', icon: Bell },
];

export function AdminNavLinks({ onNavigate, badges }: { onNavigate?: () => void; badges?: AdminNavBadges }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        const badgeCount = item.badgeKey && badges ? badges[item.badgeKey] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badgeCount > 0 && (
              <span
                className={cn(
                  'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-red-500 text-white'
                )}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
