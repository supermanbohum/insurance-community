'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPartnerBranchAction } from '@/lib/actions/partner';
import type { RegionRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function PartnerBranchCreateForm({ regions }: { regions: RegionRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [regionId, setRegionId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createPartnerBranchAction({ name, regionId, address, addressDetail });
      if (result.success) {
        toast.success('지점이 등록되었습니다.');
        router.push('/partner/branches');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-name">지점명 *</Label>
            <Input id="pb-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-address">주소 *</Label>
            <Input id="pb-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-address-detail">상세주소</Label>
            <Input id="pb-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
          </div>
          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? '등록 중...' : '지점 등록'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
