'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { PartnerNavLinks } from '@/components/partner/PartnerNavLinks';
import { PartnerStatusBadge } from '@/components/partner/PartnerStatusBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { logoutAction } from '@/lib/actions/user-auth';
import { LogoutForm } from '@/components/auth/LogoutForm';
import type { GaApprovalStatus } from '@/types/database';

export function PartnerShell({
  partnerName,
  approvalStatus,
  children,
}: {
  partnerName: string;
  approvalStatus: GaApprovalStatus | null;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-14 items-center justify-between gap-2 border-b px-4 text-sm font-semibold">
          {/* 🔴 「보험맵 파트너센터」는 원래 세 자리(데스크톱/모바일 시트/모바일 상단바) 전부
              텍스트였다 - 파트너센터에 들어오면 공개 홈으로 돌아갈 길이 로고에 없었다(K).
              사이트 로고 자리는 홈으로 가는 것이 관례이자 기대 동작이다. */}
          <Link href="/" className="transition-colors hover:text-brand-600">
            보험맵 파트너센터
          </Link>
          {approvalStatus && <PartnerStatusBadge status={approvalStatus} />}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <PartnerNavLinks />
        </div>
        <PartnerAccountFooter partnerName={partnerName} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">파트너센터 메뉴</SheetTitle>
          <div className="flex h-14 items-center justify-between gap-2 border-b px-4 text-sm font-semibold">
            {/* 시트 안에서도 같은 동작 - 홈으로 이동하며 시트를 닫는다(닫지 않으면
                라우팅 후에도 시트가 열린 채 남는다). */}
            <Link href="/" onClick={() => setMobileNavOpen(false)} className="transition-colors hover:text-brand-600">
              보험맵 파트너센터
            </Link>
            {approvalStatus && <PartnerStatusBadge status={approvalStatus} />}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <PartnerNavLinks onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <PartnerAccountFooter partnerName={partnerName} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="메뉴 열기">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex-1 text-sm font-semibold transition-colors hover:text-brand-600">
            보험맵 파트너센터
          </Link>
          {approvalStatus && <PartnerStatusBadge status={approvalStatus} />}
        </header>
        <main className="flex-1 overflow-x-hidden bg-muted/30 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function PartnerAccountFooter({ partnerName }: { partnerName: string }) {
  return (
    <div className="flex items-center gap-2.5 border-t p-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{partnerName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{partnerName}</p>
      </div>
      <LogoutForm action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm">
          로그아웃
        </Button>
      </LogoutForm>
    </div>
  );
}
