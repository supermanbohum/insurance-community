'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, MapPin, History, Megaphone, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

// W-075 - "고소득 설계사 (Legacy)" 메뉴 제거. "Legacy"는 개발 용어라 지점장이 보는
// 화면에 그대로 뜨면 안 됐고(오너 지적), planner_certifications/subscriptions
// (plan_code='planner_addon') 둘 다 0행이라 실제로 쓴 사람이 아무도 없어 라벨만
// 바꿔서 유지할 이유가 없다 - 신규 TOP 설계사 인증(top_designer_certifications)이
// 이미 이 기능을 대체했다. /partner/planners 라우트 자체는 남겨둔다(직접 URL 접근
// 가능, 데이터 삭제 아님) - 메뉴에서만 뺀다.
const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: '/partner', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/partner/company', label: 'GA 정보', icon: Building2 },
  { href: '/partner/branches', label: '지점 관리', icon: MapPin },
  { href: '/partner/inquiries', label: '받은 문의', icon: MessageSquare },
  { href: '/partner/ad-products', label: '광고 상품', icon: Megaphone },
  { href: '/partner/history', label: '변경 이력', icon: History },
];

export function PartnerNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
