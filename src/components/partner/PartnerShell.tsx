'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { PartnerNavLinks } from '@/components/partner/PartnerNavLinks';
import { PartnerStatusBadge } from '@/components/partner/PartnerStatusBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { logoutPartnerAction } from '@/lib/actions/partner-auth';
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
          보험맵 파트너센터
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
            보험맵 파트너센터
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
          <span className="flex-1 text-sm font-semibold">보험맵 파트너센터</span>
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
      <form action={logoutPartnerAction}>
        <Button type="submit" variant="ghost" size="sm">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
