'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { setBranchInsurersAction, setBranchRecommendedAction, setBranchStatusAction } from '@/lib/actions/branch-admin';
import type { BranchRow, InsurerRow } from '@/lib/admin/branch';
import { InsurerMultiSelect } from '@/components/admin/InsurerMultiSelect';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BranchExposureTab({
  branch,
  insurers,
  initialInsurerIds,
}: {
  branch: BranchRow;
  insurers: InsurerRow[];
  initialInsurerIds: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [insurerIds, setInsurerIds] = useState(initialInsurerIds);

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
    </div>
  );
}
