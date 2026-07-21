'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createBranchAction } from '@/lib/actions/branch-admin';
import type { RegionRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export function BranchCreateForm({
  gaCompanies,
  regions,
  defaultGaCompanyId,
}: {
  gaCompanies: { id: string; name: string }[];
  regions: RegionRow[];
  defaultGaCompanyId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gaCompanyId, setGaCompanyId] = useState(defaultGaCompanyId ?? '');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [introText, setIntroText] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gaCompanyId) {
      toast.error('소속 GA를 선택해주세요.');
      return;
    }
    startTransition(async () => {
      const result = await createBranchAction(gaCompanyId, {
        name,
        regionId,
        address,
        addressDetail,
        introText,
      });
      if (result.success && result.branchId) {
        toast.success('지점이 등록되었습니다.');
        router.push(`/admin/branches/${result.branchId}`);
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>소속 GA *</Label>
            <Select value={gaCompanyId} onValueChange={setGaCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="GA 선택" />
              </SelectTrigger>
              <SelectContent>
                {gaCompanies.map((ga) => (
                  <SelectItem key={ga.id} value={ga.id}>
                    {ga.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch-name">지점명 *</Label>
            <Input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch-address">주소 *</Label>
            <Input id="branch-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch-address-detail">상세주소</Label>
            <Input id="branch-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch-intro">회사소개</Label>
            <Textarea id="branch-intro" value={introText} onChange={(e) => setIntroText(e.target.value)} rows={4} />
          </div>

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? '등록 중...' : '지점 등록'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
