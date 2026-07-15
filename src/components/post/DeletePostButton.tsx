'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePostAction } from '@/lib/actions/posts';

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm('이 글을 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return;

    startTransition(async () => {
      const result = await deletePostAction(postId);
      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-60"
      >
        {isPending ? '삭제 중...' : '삭제'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
