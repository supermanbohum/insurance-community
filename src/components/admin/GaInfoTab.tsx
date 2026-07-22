'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateGaCompanyAction } from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** GA는 이제 회사 정보/로고/브랜드 소개만 갖는 상위 엔티티다 - 주소/연락처/SNS/교육/복지/채용 등
 * 실제 운영에 관한 필드는 전부 지점(Branch) 수정 화면에서 관리한다. */
export interface GaInfoDraft {
  name: string;
  ceoName: string;
  description: string;
}

export function GaInfoTab({
  ga,
  onDraftChange,
}: {
  ga: GaCompanyRow;
  onDraftChange?: (draft: GaInfoDraft) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(ga.name);
  const [ceoName, setCeoName] = useState(ga.ceo_name ?? '');
  const [description, setDescription] = useState(ga.description ?? '');

  useEffect(() => {
    onDraftChange?.({ name, ceoName, description });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, ceoName, description]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, { name, ceoName, description });
      if (result.success) toast.success('저장되었습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-name">GA명</Label>
        <Input id="ga-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>slug</Label>
        <Input value={ga.slug} disabled />
        <p className="text-xs text-muted-foreground">내부 식별용이며, 생성 후 변경할 수 없습니다.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-ceo">대표자명</Label>
        <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-desc">브랜드 소개</Label>
        <Textarea id="ga-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
