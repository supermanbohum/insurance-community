'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useChatMessages } from '@/lib/chat/useChatMessages';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatDateDivider, toKstDateKey } from './ChatDateDivider';
import { ChatComposer } from './ChatComposer';
import type { UserSession } from '@/lib/auth/types';
import { cn } from '@/lib/utils';

/**
 * 실시간 채팅 - PC 우측 고정 사이드바(variant="sidebar")와 모바일 /chat 전용 페이지
 * (variant="page")가 이 컴포넌트 하나를 그대로 공유한다(로직 중복 없음). 게이트 로직도
 * 여기 안에 있다 - 비회원/구글 로그인 회원은 채팅 UI 자체를 전혀 볼 수 없고 안내문구만 본다
 * (실제 차단은 DB RLS가 담당하지만, UI에서도 애초에 시도하지 않도록 막는다).
 */
export function ChatPanel({ currentUser, variant }: { currentUser: UserSession | null; variant: 'sidebar' | 'page' }) {
  const enabled = Boolean(currentUser?.isFullMember);
  const { messages, loading, hasMore, loadOlder } = useChatMessages(enabled);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  if (!enabled) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white p-8 text-center',
          variant === 'sidebar' ? 'h-full' : 'min-h-[60vh]'
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MessageCircle className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-ink">일반 회원가입 후 이용 가능한 기능입니다.</p>
        <Link
          href="/signup"
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          회원가입 하러가기
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-sunken', variant === 'sidebar' ? 'h-full' : 'min-h-[70vh]')}>
      <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-3">
        <MessageCircle className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-bold text-ink">실시간 채팅</span>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {loading ? (
          <p className="py-8 text-center text-xs text-ink-faint">불러오는 중...</p>
        ) : (
          <>
            {hasMore && (
              <button
                type="button"
                onClick={loadOlder}
                className="mx-auto rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-faint hover:text-brand-600"
              >
                이전 메시지 더 보기
              </button>
            )}
            {messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-faint">아직 메시지가 없습니다. 첫 메시지를 남겨보세요.</p>
            ) : (
              messages.map((m, i) => {
                const dateKey = toKstDateKey(m.createdAt);
                const prevDateKey = i > 0 ? toKstDateKey(messages[i - 1].createdAt) : null;
                return (
                  <div key={m.id} className="flex flex-col gap-3">
                    {dateKey !== prevDateKey && <ChatDateDivider dateKey={dateKey} />}
                    <ChatMessageItem message={m} isOwn={m.userId === currentUser?.id} />
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      <ChatComposer />
    </div>
  );
}
