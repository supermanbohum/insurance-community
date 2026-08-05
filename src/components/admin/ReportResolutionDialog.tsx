'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resolveReportAction, blockUserAction } from '@/lib/actions/community-admin';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/** 신고 처리 - 반려(문제 없음)/게시글·댓글 숨김/삭제/작성자 차단 중 하나로 종결한다.
 * 실제 콘텐츠 조치(숨김/삭제)와 회원 차단은 이 화면에서 신고를 "처리 완료"로
 * 표시하기만 하고, 실제 게시글/댓글 상태 변경은 각 관리 화면(게시글/댓글 관리)에서
 * 별도로 수행한다 - 신고 처리 상태와 콘텐츠 상태를 억지로 하나의 트랜잭션으로
 * 묶지 않아, 신고 없이도 콘텐츠를 조치했거나 반대의 경우에도 이력이 꼬이지 않는다. */
export function ReportResolutionDialog({
  reportId,
  targetHref,
  targetAuthorId,
}: {
  reportId: string;
  targetHref: string | null;
  targetAuthorId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState('');

  function resolve(status: 'resolved_normal' | 'resolved_hidden' | 'resolved_deleted' | 'resolved_ban', label: string) {
    startTransition(async () => {
      // 작성자 차단은 신고 상태만 바꾸는 게 아니라 실제로 user_blocks에 차단 행을 넣어야
      // 의미가 있다 - 작성자 id가 없는(삭제된 게시글/댓글) 경우는 차단할 대상이 없다.
      if (status === 'resolved_ban') {
        if (!targetAuthorId) {
          toast.error('작성자 정보를 찾을 수 없어 차단할 수 없습니다.');
          return;
        }
        const blockResult = await blockUserAction(targetAuthorId, note.trim() || '신고 처리에 따른 차단');
        if (!blockResult.success) {
          toast.error(blockResult.error);
          return;
        }
      }

      const result = await resolveReportAction(reportId, status, note);
      if (result.success) {
        toast.success(`신고를 "${label}"로 처리했습니다.`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          처리
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>신고 처리</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {targetHref && (
            <a href={targetHref} target="_blank" rel="noreferrer" className="w-fit text-sm text-primary underline">
              게시글 보기
            </a>
          )}
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="처리 메모 (선택)" rows={2} />
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => resolve('resolved_normal', '반려')}>
            신고 반려
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => resolve('resolved_hidden', '숨김 처리')}>
            숨김 처리
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => resolve('resolved_deleted', '삭제 처리')}>
            삭제 처리
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => resolve('resolved_ban', '작성자 차단')}>
            작성자 차단
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
