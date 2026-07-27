'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { registerGaAction } from '@/lib/actions/partner';
import type { RegionRow } from '@/lib/admin/branch';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { GaSelect } from '@/components/partner/GaSelect';
import { AddressSearchField, type AddressValue } from '@/components/admin/AddressSearchField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OnboardingForm({ regions, gaOptions }: { regions: RegionRow[]; gaOptions: GaFilterOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [gaName, setGaName] = useState('');

  const [branchName, setBranchName] = useState('');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [addressValue, setAddressValue] = useState<AddressValue>({ address: '', addressDetail: '', zonecode: '', lat: null, lng: null });
  const [introText, setIntroText] = useState('');
  const [plannerCount, setPlannerCount] = useState('');
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [visitConsultAvailable, setVisitConsultAvailable] = useState(false);
  const [businessHours, setBusinessHours] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerGaAction({
        gaName,
        branch: {
          name: branchName,
          regionId,
          address: addressValue.address,
          addressDetail: addressValue.addressDetail,
          lat: addressValue.lat,
          lng: addressValue.lng,
          introText,
          plannerCount: plannerCount ? Number(plannerCount) : null,
          parkingAvailable,
          visitConsultAvailable,
          businessHours,
        },
      });
      if (result.success) {
        toast.success('등록 신청이 접수되었습니다. 관리자 승인 후 공개됩니다.');
        router.push('/partner');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 소속 GA 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <GaSelect options={gaOptions} value={gaName} onChange={setGaName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 지점명</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-branch-name">지점명</Label>
            <Input id="onb-branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">③ 주소 검색</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
          <AddressSearchField value={addressValue} onChange={setAddressValue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">④ 상세 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-intro">지점 소개</Label>
            <Textarea id="onb-intro" value={introText} onChange={(e) => setIntroText(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onb-planner-count">설계사 수</Label>
              <Input
                id="onb-planner-count"
                type="number"
                min={0}
                value={plannerCount}
                onChange={(e) => setPlannerCount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onb-hours">운영시간</Label>
              <Input
                id="onb-hours"
                placeholder="평일 09:00-18:00"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="onb-parking" className="cursor-pointer font-normal">
              주차 가능
            </Label>
            <Switch id="onb-parking" checked={parkingAvailable} onCheckedChange={setParkingAvailable} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="onb-visit" className="cursor-pointer font-normal">
              방문 상담 가능
            </Label>
            <Switch id="onb-visit" checked={visitConsultAvailable} onCheckedChange={setVisitConsultAvailable} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending || !gaName || !addressValue.address} size="lg">
        {isPending ? '제출 중...' : '⑤ 등록 신청'}
      </Button>
    </form>
  );
}
