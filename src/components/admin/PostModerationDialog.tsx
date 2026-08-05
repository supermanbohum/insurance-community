'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  setPostStatusAction,
  setPostNoticeAction,
  setPostBestAction,
  blockUserAction,
} from '@/lib/actions/community-admin';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { PostStatus } from '@/types/database';

const STATUS_LABEL: Record<PostStatus, string> = { visible: '공개', hidden: '숨김', deleted: '삭제' };

export function PostModerationDialog({
  postId,
  postTitle,
  authorId,
  status,
  isNotice,
  isBest,
}: {
  postId: string;
  postTitle: string;
  authorId: string;
  status: PostStatus;
  isNotice: boolean;
  isBest: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);

  function run(promise: Promise<{ success: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await promise;
      if (result.success) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error ?? '처리하지 못했습니다.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          관리
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="line-clamp-2">{postTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">상태 변경 (현재: {STATUS_LABEL[status]})</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (선택)" rows={2} className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {(['visible', 'hidden', 'deleted'] as PostStatus[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={s === status ? 'secondary' : 'outline'}
                  disabled={isPending || s === status}
                  onClick={() => run(setPostStatusAction(postId, s, reason), `${STATUS_LABEL[s]} 처리되었습니다.`)}
                >
                  {s === 'visible' ? '공개로 복원' : STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">노출 옵션</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => run(setPostNoticeAction(postId, !isNotice), isNotice ? '공지 해제되었습니다.' : '공지로 등록되었습니다.')}
              >
                {isNotice ? '공지 해제' : '공지 등록'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => run(setPostBestAction(postId, !isBest), isBest ? '베스트 해제되었습니다.' : '베스트로 등록되었습니다.')}
              >
                {isBest ? '베스트 해제' : '베스트 등록'}
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">작성자 조치</p>
            {showBlockInput ? (
              <div className="flex flex-col gap-2">
                <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="차단 사유 (필수)" rows={2} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending || !blockReason.trim()}
                    onClick={() => run(blockUserAction(authorId, blockReason), '작성자를 차단했습니다.')}
                  >
                    차단 확정
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowBlockInput(false)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" size="sm" variant="destructive" onClick={() => setShowBlockInput(true)}>
                작성자 차단
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
