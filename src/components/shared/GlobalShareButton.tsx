'use client';

import { Share2 } from 'lucide-react';
import { useKakaoShare } from '@/lib/kakao/useKakaoShare';
import { SITE_SHARE_CONTENT } from '@/lib/kakao/siteShareContent';
import { cn } from '@/lib/utils';

/** 카카오 공유 1순위(오너 지시, 2026-08-10) - "친구에게 보험맵 공유하기". 지점
 * 상세(KakaoShareButton)와 동일한 useKakaoShare 훅을 재사용하고, 콘텐츠만
 * 사이트 전역 값(SITE_SHARE_CONTENT)으로 고정된다. 홈 화면과 햄버거 메뉴 두
 * 곳에서 쓰이며 시각 스타일만 다르다. */
export function GlobalShareButton({ variant, onClick }: { variant: 'home' | 'menu'; onClick?: () => void }) {
  const { share, isPending } = useKakaoShare(SITE_SHARE_CONTENT);

  function handleClick() {
    onClick?.();
    share();
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEE500]/70 text-[#3C1E1E]">
          <Share2 className="h-4 w-4" />
        </span>
        친구에게 보험맵 공유하기
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-4 py-3.5 text-[13px] font-bold text-[#3C1E1E] shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover disabled:opacity-60'
      )}
    >
      <Share2 className="h-4 w-4" />
      친구에게 보험맵 공유하기
    </button>
  );
}
