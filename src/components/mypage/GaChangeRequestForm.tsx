'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { requestGaChangeAction, type MyGaChangeRequest } from '@/lib/actions/ga-change-request';
import { GaSearchSelect } from '@/components/auth/GaSearchSelect';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GaChangeRequestForm({
  gaOptions,
  currentGaName,
  pendingRequest,
}: {
  gaOptions: GaFilterOption[];
  currentGaName: string | null;
  pendingRequest: MyGaChangeRequest | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [gaCompanyId, setGaCompanyId] = useState<string | null>(null);

  const pendingGaName = useMemo(
    () => (pendingRequest ? (gaOptions.find((o) => o.id === pendingRequest.requestedGaCompanyId)?.name ?? '알 수 없음') : null),
    [pendingRequest, gaOptions]
  );

  function handleSubmit() {
    if (!gaCompanyId) return;
    startTransition(async () => {
      const result = await requestGaChangeAction(gaCompanyId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('변경 신청이 접수되었습니다. 운영팀 승인 후 반영됩니다.');
      setGaCompanyId(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">소속 GA 변경 신청</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          현재 소속: <span className="font-semibold text-ink">{currentGaName ?? '미지정'}</span>
        </p>
        {pendingRequest ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
            <p className="font-semibold">
              {pendingGaName}(으)로 변경 신청 대기중입니다. 운영팀 승인 후 반영됩니다.
            </p>
          </div>
        ) : (
          <>
            <GaSearchSelect options={gaOptions} value={gaCompanyId} onChange={setGaCompanyId} placeholder="변경할 GA를 검색하세요" />
            <Button type="button" disabled={isPending || !gaCompanyId} onClick={handleSubmit} className="self-start">
              변경 신청
            </Button>
            <p className="text-[11px] text-muted-foreground">이직 등으로 소속이 바뀌는 경우를 위한 기능이며, 즉시 반영되지 않고 운영팀 승인 후 반영됩니다.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
