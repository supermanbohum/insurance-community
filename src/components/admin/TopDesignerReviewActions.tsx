'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reviewTopDesignerCertificationAction } from '@/lib/actions/top-designer-admin';
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

/** 승인/보류/반려 3단계(+보류→재심사 되돌리기) - 이 코드베이스 최초의 3+상태 심사
 * 컴포넌트. 승인만 별등급+확정금액 입력이 필요해 AlertDialog가 아닌 Dialog를 쓴다. */
export function TopDesignerReviewActions({
  certificationId,
  plannerName,
  status,
  ocrExtractedIncomeKrw,
}: {
  certificationId: string;
  plannerName: string;
  status: 'pending_review' | 'on_hold' | 'approved' | 'rejected';
  ocrExtractedIncomeKrw: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [starTier, setStarTier] = useState<StarTier | ''>('');
  const [confirmedIncome, setConfirmedIncome] = useState(ocrExtractedIncomeKrw ? String(ocrExtractedIncomeKrw) : '');
  const [reasonMode, setReasonMode] = useState<'on_hold' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');

  function run(decision: 'approved' | 'on_hold' | 'rejected' | 'pending_review', options: { starTier?: StarTier; confirmedIncomeKrw?: number; reason?: string } = {}) {
    startTransition(async () => {
      const result = await reviewTopDesignerCertificationAction(certificationId, decision, options);
      if (result.success) {
        toast.success('처리되었습니다.');
        setApproveOpen(false);
        setReasonMode(null);
        setReason('');
        router.push('/admin/top-designer');
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
          승인
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{plannerName}님을 TOP 설계사로 승인할까요?</DialogTitle>
            <DialogDescription>별등급과 확정 연봉을 입력해주세요. 원천징수영수증을 직접 확인 후 입력합니다.</DialogDescription>
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
              <Input
                type="number"
                value={confirmedIncome}
                onChange={(e) => setConfirmedIncome(e.target.value)}
                placeholder="예: 300000000"
              />
              {ocrExtractedIncomeKrw && <p className="text-xs text-muted-foreground">OCR 인식값: {ocrExtractedIncomeKrw.toLocaleString()}원 (참고용)</p>}
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
            <DialogDescription>신청자에게 표시되지 않으며 관리자 심사 기록에만 남습니다.</DialogDescription>
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
