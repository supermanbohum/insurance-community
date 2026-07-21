'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { AdminNavLinks } from '@/components/admin/AdminNavLinks';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { signOutAdminAction } from '@/lib/actions/admin-auth';
import { SITE_CONFIG } from '@/lib/config/site';

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">
          {SITE_CONFIG.shortName} 관리자
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNavLinks />
        </div>
        <AdminAccountFooter adminName={adminName} />
      </aside>

      {/* 모바일 사이드바 */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">관리자 메뉴</SheetTitle>
          <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">
            {SITE_CONFIG.shortName} 관리자
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AdminNavLinks onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <AdminAccountFooter adminName={adminName} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="메뉴 열기">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold">{SITE_CONFIG.shortName} 관리자</span>
        </header>
        <main className="flex-1 overflow-x-hidden bg-muted/30 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function AdminAccountFooter({ adminName }: { adminName: string }) {
  return (
    <div className="flex items-center gap-2.5 border-t p-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{adminName.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{adminName}</p>
      </div>
      <form action={signOutAdminAction}>
        <Button type="submit" variant="ghost" size="sm">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
