'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { toggleFavoriteAction } from '@/lib/actions/favorites';
import { cn } from '@/lib/utils';

/**
 * 즐겨찾기 토글 버튼. 비로그인 상태에서 누르면 toggleFavoriteAction이
 * `{success:false, requireLogin:true}`를 반환하고, 이 컴포넌트가 그걸 보고 /login으로 보낸다.
 */
export function BranchFavoriteButton({ branchId, initialFavorited }: { branchId: string; initialFavorited: boolean }) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleFavoriteAction(branchId);
      if (!result.success) {
        router.push('/login');
        return;
      }
      setFavorited(result.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-pressed={favorited}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-card transition-colors',
        favorited
          ? 'border-rose-200 bg-rose-50 text-rose-500'
          : 'border-line bg-white text-ink-faint hover:border-rose-200 hover:text-rose-400'
      )}
    >
      <Heart className={cn('h-4 w-4', favorited && 'fill-rose-500')} />
    </button>
  );
}
