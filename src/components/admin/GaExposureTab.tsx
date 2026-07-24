'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  setGaDisplayStatusAction,
  verifyGaCompanyAction,
  getGaCompanyDeleteImpactAction,
  deleteGaCompanyAction,
  type GaCompanyDeleteImpact,
} from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function GaExposureTab({ ga }: { ga: GaCompanyRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isVerified, setIsVerified] = useState(ga.is_verified);
  const [isVisible, setIsVisible] = useState(ga.status === 'visible');
  const [deleteImpact, setDeleteImpact] = useState<GaCompanyDeleteImpact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleVerifyToggle(checked: boolean) {
    setIsVerified(checked);
    startTransition(async () => {
      const result = await verifyGaCompanyAction(ga.id, checked);
      if (result.success) toast.success(checked ? '공식 인증 배지를 부여했습니다.' : '공식 인증 배지를 해제했습니다.');
      else {
        toast.error(result.error);
        setIsVerified(!checked);
      }
    });
  }

  function handleVisibleToggle(checked: boolean) {
    setIsVisible(checked);
    startTransition(async () => {
      const result = await setGaDisplayStatusAction(ga.id, checked ? 'visible' : 'hidden');
      if (result.success) toast.success(checked ? '공개로 전환했습니다.' : '비공개로 전환했습니다.');
      else {
        toast.error(result.error);
        setIsVisible(!checked);
      }
    });
  }

  async function handleOpenDeleteDialog(open: boolean) {
    if (open && !deleteImpact) {
      const impact = await getGaCompanyDeleteImpactAction(ga.id);
      setDeleteImpact(impact);
    }
  }

  function handleDelete() {
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteGaCompanyAction(ga.id);
      setIsDeleting(false);
      if (result.success) {
        toast.success('GA가 삭제되었습니다.');
        router.push('/admin/ga');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">노출 여부</CardTitle>
          <CardDescription>
            승인({ga.approval_status === 'approved' ? '완료' : '대기 중'})과 별개로, 승인 이후에도 임시로 공개를 끌 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch checked={isVisible} onCheckedChange={handleVisibleToggle} disabled={isPending} />
            <span className="text-sm">{isVisible ? '공개' : '비공개'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">공식 인증 GA</CardTitle>
          <CardDescription>승인 상태와는 별개의 신뢰 배지입니다. 소속 지점 상세페이지에 노출됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch checked={isVerified} onCheckedChange={handleVerifyToggle} disabled={isPending} />
            <span className="text-sm">{isVerified ? '인증됨' : '미인증'}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">GA 삭제</CardTitle>
          <CardDescription>
            삭제하면 소속된 모든 지점도 함께 비공개(삭제) 처리되며, 공개 사이트와 관리자 목록에서 즉시 사라집니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog onOpenChange={handleOpenDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                GA 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>&quot;{ga.name}&quot;을(를) 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="flex flex-col gap-2">
                    <span>이 작업은 즉시 적용되며, 공개 사이트와 관리자 목록에서 더 이상 보이지 않습니다.</span>
                    {deleteImpact ? (
                      <span className="rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                        소속 지점 {deleteImpact.branchCount}개가 함께 비공개(삭제) 처리됩니다.
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">연관 데이터를 확인하는 중...</span>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
