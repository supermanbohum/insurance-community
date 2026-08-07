'use client';

import { usePathname } from 'next/navigation';
import { ChatPanel } from './ChatPanel';
import type { UserSession } from '@/lib/auth/types';

/**
 * (main)/layout.tsx의 우측 고정 채팅 사이드바(W-035) - /chat 페이지는 이미 같은
 * ChatPanel을 variant="page"로 전체화면 렌더링하므로, 그 위에 사이드바까지 겹치면
 * 동일한 실시간 채팅이 입력창 2개로 중복 표시된다. usePathname으로 /chat에서만
 * 숨긴다(EventPopup의 홈 전용 노출과 동일한 패턴, W-004).
 */
export function ChatSidebarSlot({ currentUser }: { currentUser: UserSession | null }) {
  const pathname = usePathname();
  if (pathname === '/chat') return null;

  return (
    <aside className="hidden w-[340px] shrink-0 lg:block">
      <div className="sticky top-[76px] h-[calc(100vh-96px)] py-3">
        <ChatPanel currentUser={currentUser} variant="sidebar" />
      </div>
    </aside>
  );
}
