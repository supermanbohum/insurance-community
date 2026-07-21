'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateGaCompanyProfileAction } from '@/lib/actions/partner';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CompanyForm({ company }: { company: GaCompanyRow }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(company.name);
  const [ceoName, setCeoName] = useState(company.ceo_name ?? '');
  const [description, setDescription] = useState(company.description ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyProfileAction({ name, ceoName, description });
      if (result.success) {
        toast.success(result.pending ? '수정 신청이 접수되었습니다. 관리자 승인 후 반영됩니다.' : '저장되었습니다.');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GA 기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">GA명</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-ceo">대표자명</Label>
            <Input id="company-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-desc">GA 소개</Label>
            <Textarea id="company-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? '저장 중...' : company.approval_status === 'approved' ? '수정 신청' : '저장'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
