'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  setBranchInsurersAction,
  setBranchRecommendedAction,
  setBranchStatusAction,
  getBranchDeleteImpactAction,
  deleteBranchAction,
  type BranchDeleteImpact,
} from '@/lib/actions/branch-admin';
import type { BranchRow, InsurerRow } from '@/lib/admin/branch';
import { InsurerMultiSelect } from '@/components/admin/InsurerMultiSelect';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

export function BranchExposureTab({
  branch,
  insurers,
  initialInsurerIds,
}: {
  branch: BranchRow;
  insurers: InsurerRow[];
  initialInsurerIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [insurerIds, setInsurerIds] = useState(initialInsurerIds);
  const [deleteImpact, setDeleteImpact] = useState<BranchDeleteImpact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleStatusToggle(checked: boolean) {
    startTransition(async () => {
      const result = await setBranchStatusAction(branch.id, checked ? 'visible' : 'hidden');
      if (result.success) toast.success(checked ? '공개로 전환했습니다.' : '비공개로 전환했습니다.');
      else toast.error(result.error);
    });
  }

  function handleRecommendedToggle(checked: boolean) {
    startTransition(async () => {
      const result = await setBranchRecommendedAction(branch.id, checked);
      if (result.success) toast.success(checked ? '추천 지점으로 설정했습니다.' : '추천을 해제했습니다.');
      else toast.error(result.error);
    });
  }

  function handleSaveInsurers() {
    startTransition(async () => {
      const result = await setBranchInsurersAction(branch.id, insurerIds);
      if (result.success) toast.success('취급 원수사를 저장했습니다.');
      else toast.error(result.error);
    });
  }

  async function handleOpenDeleteDialog(open: boolean) {
    if (open && !deleteImpact) {
      const impact = await getBranchDeleteImpactAction(branch.id);
      setDeleteImpact(impact);
    }
  }

  function handleDelete() {
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteBranchAction(branch.id);
      setIsDeleting(false);
      if (result.success) {
        toast.success('지점이 삭제되었습니다.');
        router.push('/admin/branches');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">공개 여부</CardTitle>
          <CardDescription>비공개로 전환하면 GA가 승인 상태여도 이 지점만 숨길 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch checked={branch.status === 'visible'} onCheckedChange={handleStatusToggle} disabled={isPending} />
          <span className="text-sm">{branch.status === 'visible' ? '공개' : '비공개'}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">추천 지점</CardTitle>
          <CardDescription>홈 화면의 추천 GA 섹션에 노출됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch checked={branch.is_recommended} onCheckedChange={handleRecommendedToggle} disabled={isPending} />
          <span className="text-sm">{branch.is_recommended ? '추천중' : '미지정'}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">취급 원수사</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InsurerMultiSelect insurers={insurers} selectedIds={insurerIds} onChange={setInsurerIds} />
          <Button onClick={handleSaveInsurers} disabled={isPending} className="self-start">
            {isPending ? '저장 중...' : '취급 원수사 저장'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">지점 삭제</CardTitle>
          <CardDescription>
            삭제하면 홈/검색/지도/상세페이지를 포함한 모든 공개 화면과 관리자 목록에서 즉시 사라집니다. 되돌리려면
            데이터베이스에서 직접 복구해야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog onOpenChange={handleOpenDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                지점 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>&quot;{branch.name}&quot; 지점을 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="flex flex-col gap-2">
                    <span>이 작업은 즉시 적용되며, 공개 사이트와 관리자 목록에서 더 이상 보이지 않습니다.</span>
                    {deleteImpact ? (
                      <span className="rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                        연관 데이터: 사진/영상 {deleteImpact.mediaCount}개, 연락처 {deleteImpact.contactsCount}개, 진행중
                        채용공고 {deleteImpact.activeRecruitCount}건, 누적 조회수 {deleteImpact.viewCount}회
                        <br />
                        이 데이터는 삭제되지 않고 보관되지만, 지점이 비공개 처리되며 함께 노출이 중단됩니다.
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
