'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateGaCompanyAction, verifyGaCompanyAction } from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GaExposureTab({ ga }: { ga: GaCompanyRow }) {
  const [isPending, startTransition] = useTransition();
  const [isVerified, setIsVerified] = useState(ga.is_verified);
  const [isRecruiting, setIsRecruiting] = useState(ga.is_recruiting);
  const [isVisible, setIsVisible] = useState(ga.status === 'visible');

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

  function handleRecruitingToggle(checked: boolean) {
    setIsRecruiting(checked);
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, { isRecruiting: checked });
      if (result.success) toast.success(checked ? '채용중 배지를 노출합니다.' : '채용중 배지를 해제했습니다.');
      else {
        toast.error(result.error);
        setIsRecruiting(!checked);
      }
    });
  }

  function handleVisibleToggle(checked: boolean) {
    setIsVisible(checked);
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, { status: checked ? 'visible' : 'hidden' });
      if (result.success) toast.success(checked ? '공개로 전환했습니다.' : '비공개로 전환했습니다.');
      else {
        toast.error(result.error);
        setIsVisible(!checked);
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
          <CardTitle className="text-base">채용중 배지</CardTitle>
          <CardDescription>지점별 채용공고와 별개로, GA 카드/상세에 채용중 배지를 노출합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch checked={isRecruiting} onCheckedChange={handleRecruitingToggle} disabled={isPending} />
            <span className="text-sm">{isRecruiting ? '채용중' : '채용중 아님'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">공식 인증 GA</CardTitle>
          <CardDescription>승인 상태와는 별개의 신뢰 배지입니다. GA 상세페이지에 노출됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch checked={isVerified} onCheckedChange={handleVerifyToggle} disabled={isPending} />
            <span className="text-sm">{isVerified ? '인증됨' : '미인증'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
