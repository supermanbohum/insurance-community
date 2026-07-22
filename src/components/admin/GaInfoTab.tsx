'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateGaCompanyAction } from '@/lib/actions/ga-admin';
import type { GaCompanyRow } from '@/lib/admin/ga';
import { AddressSearchField, type AddressValue } from '@/components/admin/AddressSearchField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface GaInfoDraft {
  name: string;
  ceoName: string;
  phone: string;
  homepageUrl: string;
  operationType: 'direct' | 'branch';
  isHeadquarters: boolean;
  address: AddressValue;
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
  const [phone, setPhone] = useState(ga.phone ?? '');
  const [homepageUrl, setHomepageUrl] = useState(ga.homepage_url ?? '');
  const [operationType, setOperationType] = useState<'direct' | 'branch'>(ga.operation_type);
  const [isHeadquarters, setIsHeadquarters] = useState(ga.is_headquarters);
  const [addressValue, setAddressValue] = useState<AddressValue>({
    address: ga.address ?? '',
    addressDetail: ga.address_detail ?? '',
    zonecode: ga.zonecode ?? '',
    lat: ga.lat,
    lng: ga.lng,
  });

  useEffect(() => {
    onDraftChange?.({ name, ceoName, phone, homepageUrl, operationType, isHeadquarters, address: addressValue });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, ceoName, phone, homepageUrl, operationType, isHeadquarters, addressValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, {
        name,
        ceoName,
        phone,
        homepageUrl,
        operationType,
        isHeadquarters,
        address: addressValue.address,
        addressDetail: addressValue.addressDetail,
        zonecode: addressValue.zonecode,
        lat: addressValue.lat ?? undefined,
        lng: addressValue.lng ?? undefined,
      });
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
        <p className="text-xs text-muted-foreground">slug은 생성 후 변경할 수 없습니다.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ga-ceo">대표자명</Label>
        <Input id="ga-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ga-phone">대표번호</Label>
          <Input id="ga-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-1234-5678" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ga-homepage">홈페이지</Label>
          <Input id="ga-homepage" value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>

      <AddressSearchField value={addressValue} onChange={setAddressValue} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>운영 형태</Label>
          <Select value={operationType} onValueChange={(v) => setOperationType(v as 'direct' | 'branch')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">직영</SelectItem>
              <SelectItem value="branch">지사</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>본사 여부</Label>
          <div className="flex h-9 items-center gap-2">
            <Switch checked={isHeadquarters} onCheckedChange={setIsHeadquarters} />
            <span className="text-sm text-muted-foreground">{isHeadquarters ? '본사' : '본사 아님'}</span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
