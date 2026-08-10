'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewTopDesignerCertificationRevisionAction } from '@/lib/actions/top-designer-admin';
import { STAR_TIER_LABEL, STAR_TIER_OPTIONS, type StarTier } from '@/lib/top-designer/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** E 재심사 처리 - TopDesignerReviewActions와 동일한 4단계(승인/보류/반려/되돌리기)를
 * 재심사 제안(top_designer_certification_revisions)에 대해 수행한다. 승인만 원본
 * 인증 행에 반영되고, 반려/보류는 원본을 건드리지 않는다(0091). */
export function TopDesignerRevisionReviewActions({
  revisionId,
  certificationId,
  status,
  declaredIncomeKrw,
}: {
  revisionId: string;
  certificationId: string;
  status: 'pending_review' | 'on_hold' | 'approved' | 'rejected';
  declaredIncomeKrw: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [starTier, setStarTier] = useState<StarTier | ''>('');
  const [confirmedIncome, setConfirmedIncome] = useState(declaredIncomeKrw ? String(declaredIncomeKrw) : '');
  const [reasonMode, setReasonMode] = useState<'on_hold' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');

  function run(decision: 'approved' | 'on_hold' | 'rejected' | 'pending_review', options: { starTier?: StarTier; confirmedIncomeKrw?: number; reason?: string } = {}) {
    startTransition(async () => {
      const result = await reviewTopDesignerCertificationRevisionAction(revisionId, certificationId, decision, options);
      if (result.success) {
        toast.success('처리되었습니다.');
        setApproveOpen(false);
        setReasonMode(null);
        setReason('');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (status === 'approved' || status === 'rejected') {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <Button disabled={isPending} onClick={() => setApproveOpen(true)}>
          재심사 승인
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재심사 제안을 승인할까요?</DialogTitle>
            <DialogDescription>승인하면 제안된 직급·소속·연봉이 공개 인증 정보에 즉시 반영됩니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">별등급</label>
              <Select value={starTier} onValueChange={(v) => setStarTier(v as StarTier)}>
                <SelectTrigger>
                  <SelectValue placeholder="별등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  {STAR_TIER_OPTIONS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {STAR_TIER_LABEL[tier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">확정 연봉(원)</label>
              <Input type="number" value={confirmedIncome} onChange={(e) => setConfirmedIncome(e.target.value)} placeholder="예: 300000000" />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isPending || !starTier || !confirmedIncome}
              onClick={() => run('approved', { starTier: starTier as StarTier, confirmedIncomeKrw: Number(confirmedIncome) })}
            >
              승인 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" disabled={isPending} onClick={() => setReasonMode('on_hold')}>
        보류
      </Button>
      <Button variant="destructive" disabled={isPending} onClick={() => setReasonMode('rejected')}>
        반려
      </Button>

      {status === 'on_hold' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              심사 대기로 되돌리기
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>다시 심사 대기 상태로 되돌릴까요?</AlertDialogTitle>
              <AlertDialogDescription>보류 사유가 초기화되고 대기 목록에 다시 표시됩니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => run('pending_review')}>되돌리기</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={reasonMode !== null} onOpenChange={(open) => !open && setReasonMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonMode === 'rejected' ? '반려 사유' : '보류 사유'}</DialogTitle>
            <DialogDescription>반려 시 기존 승인 정보는 그대로 유지됩니다.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유를 입력해주세요" rows={3} />
          <DialogFooter>
            <Button
              variant={reasonMode === 'rejected' ? 'destructive' : 'default'}
              disabled={isPending || !reason.trim()}
              onClick={() => reasonMode && run(reasonMode, { reason: reason.trim() })}
            >
              {reasonMode === 'rejected' ? '반려 확정' : '보류 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
