'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { registerGaAction } from '@/lib/actions/partner';
import type { RegionRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OnboardingForm({ regions }: { regions: RegionRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [description, setDescription] = useState('');

  const [branchName, setBranchName] = useState('');
  const [regionId, setRegionId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [introText, setIntroText] = useState('');
  const [plannerCount, setPlannerCount] = useState('');
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [visitConsultAvailable, setVisitConsultAvailable] = useState(false);
  const [businessHours, setBusinessHours] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerGaAction({
        name,
        ceoName,
        description,
        branch: {
          name: branchName,
          regionId,
          address,
          addressDetail,
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
          <CardTitle className="text-base">GA 기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-name">GA명</Label>
            <Input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-ceo">대표자명</Label>
            <Input id="onb-ceo" value={ceoName} onChange={(e) => setCeoName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-desc">GA 소개</Label>
            <Textarea id="onb-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">첫 지점 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-branch-name">지점명</Label>
            <Input id="onb-branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
          </div>
          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-address">주소</Label>
            <Input id="onb-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-address-detail">상세주소</Label>
            <Input id="onb-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
          </div>
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

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? '제출 중...' : '등록 신청'}
      </Button>
    </form>
  );
}
