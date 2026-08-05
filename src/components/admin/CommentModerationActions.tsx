'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setCommentStatusAction } from '@/lib/actions/community-admin';
import { Button } from '@/components/ui/button';
import type { PostStatus } from '@/types/database';

export function CommentModerationActions({ commentId, status }: { commentId: string; status: PostStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(next: PostStatus, label: string) {
    startTransition(async () => {
      const result = await setCommentStatusAction(commentId, next);
      if (result.success) {
        toast.success(`${label} 처리되었습니다.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex gap-1.5">
      {status !== 'visible' && (
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => run('visible', '복원')}>
          복원
        </Button>
      )}
      {status !== 'hidden' && (
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => run('hidden', '숨김')}>
          숨김
        </Button>
      )}
      {status !== 'deleted' && (
        <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => run('deleted', '삭제')}>
          삭제
        </Button>
      )}
    </div>
  );
}
