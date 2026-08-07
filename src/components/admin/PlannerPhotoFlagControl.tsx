'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setPlannerPhotoFlagAction } from '@/lib/actions/planner-photo-flag';

const PROHIBITED_EXAMPLES = ['화면 캡처·스크린샷', '신분증·자격증·명함 등 문서 이미지', '실명·소속·직급이 판독되는 사진', '본인이 아닌 인물 사진'];

/** W-064 - 프로필 사진 심사. 하드 차단이 아니라 관리자 판단 플래그다 - 승인 자체를
 * 막지 않고, 플래그된 사진만 공개 화면에서 억제된다(0067 마이그레이션, 뷰 레벨 처리라
 * PlannerCard 등 기존 컴포넌트는 이미 있던 "사진 없음" 폴백을 그대로 탄다). */
export function PlannerPhotoFlagControl({
  profileId,
  photoUrl,
  photoFlagged,
  photoFlagReason,
}: {
  profileId: string;
  photoUrl: string | null;
  photoFlagged: boolean;
  photoFlagReason: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');

  function flag(reasonText: string) {
    startTransition(async () => {
      const result = await setPlannerPhotoFlagAction(profileId, true, reasonText);
      if (result.success) {
        toast.success('사진을 반려 처리했습니다. 공개 화면에서 즉시 가려집니다.');
        setDialogOpen(false);
        setReason('');
        router.refresh();
      } else {
        toast.error('처리에 실패했습니다.');
      }
    });
  }

  function unflag() {
    startTransition(async () => {
      const result = await setPlannerPhotoFlagAction(profileId, false);
      if (result.success) {
        toast.success('반려를 해제했습니다.');
        router.refresh();
      } else {
        toast.error('처리에 실패했습니다.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
          {photoUrl ? (
            <Image src={photoUrl} alt="프로필 사진" fill sizes="112px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-8 w-8" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            본인 단독 사진만 허용합니다. 다음은 반려 대상입니다:
            <br />
            {PROHIBITED_EXAMPLES.join(' · ')}
          </p>
          {photoFlagged ? (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <ShieldAlert className="h-4 w-4" /> 반려됨 - 공개 화면에서 가려짐
              </p>
              {photoFlagReason && <p className="text-xs text-muted-foreground">사유: {photoFlagReason}</p>}
              <Button size="sm" variant="outline" className="w-fit gap-1.5" disabled={isPending} onClick={unflag}>
                <ShieldCheck className="h-3.5 w-3.5" /> 반려 해제
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-fit gap-1.5 text-destructive"
              disabled={isPending || !photoUrl}
              onClick={() => setDialogOpen(true)}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> 사진 반려
            </Button>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사진 반려 사유</DialogTitle>
            <DialogDescription>반려하면 이 프로필의 사진이 공개 화면(검색·상세)에서 즉시 가려집니다. 프로필 자체의 승인 상태는 바뀌지 않습니다.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 화면 캡처 이미지, 신분증 노출" rows={3} />
          <DialogFooter>
            <Button variant="destructive" disabled={isPending || !reason.trim()} onClick={() => flag(reason.trim())}>
              반려 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
