'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateBranchAction } from '@/lib/actions/branch-admin';
import type { BranchRow, RegionRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface BranchInfoDraft {
  name: string;
  address: string;
  addressDetail: string;
  introText: string;
  educationInfo: string;
  welfareInfo: string;
  dbSupportInfo: string;
  settlementSupportInfo: string;
}

export function BranchInfoTab({
  branch,
  regions,
  onDraftChange,
}: {
  branch: BranchRow;
  regions: RegionRow[];
  /** 저장 전 실시간 미리보기 반영용 - 입력할 때마다 현재 값을 그대로 올려보낸다. */
  onDraftChange?: (draft: BranchInfoDraft) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(branch.name);
  const [regionId, setRegionId] = useState<string | null>(branch.region_id);
  const [address, setAddress] = useState(branch.address);
  const [addressDetail, setAddressDetail] = useState(branch.address_detail ?? '');
  const [introText, setIntroText] = useState(branch.intro_text ?? '');
  const [educationInfo, setEducationInfo] = useState(branch.education_info ?? '');
  const [welfareInfo, setWelfareInfo] = useState(branch.welfare_info ?? '');
  const [dbSupportInfo, setDbSupportInfo] = useState(branch.db_support_info ?? '');
  const [settlementSupportInfo, setSettlementSupportInfo] = useState(branch.settlement_support_info ?? '');

  useEffect(() => {
    onDraftChange?.({
      name,
      address,
      addressDetail,
      introText,
      educationInfo,
      welfareInfo,
      dbSupportInfo,
      settlementSupportInfo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, address, addressDetail, introText, educationInfo, welfareInfo, dbSupportInfo, settlementSupportInfo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBranchAction(branch.id, {
        name,
        regionId,
        address,
        addressDetail,
        lat: branch.lat ?? undefined,
        lng: branch.lng ?? undefined,
        introText,
        educationInfo,
        welfareInfo,
        dbSupportInfo,
        settlementSupportInfo,
      });
      if (result.success) {
        toast.success('저장되었습니다.');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-name">지점명</Label>
        <Input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-address">주소</Label>
        <Input id="branch-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-address-detail">상세주소</Label>
        <Input id="branch-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-intro">회사소개</Label>
        <Textarea id="branch-intro" value={introText} onChange={(e) => setIntroText(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-education">교육 안내</Label>
        <Textarea id="branch-education" value={educationInfo} onChange={(e) => setEducationInfo(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-welfare">복지 안내</Label>
        <Textarea id="branch-welfare" value={welfareInfo} onChange={(e) => setWelfareInfo(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-db-support">DB지원 안내</Label>
        <Textarea id="branch-db-support" value={dbSupportInfo} onChange={(e) => setDbSupportInfo(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-settlement">정착지원 안내</Label>
        <Textarea
          id="branch-settlement"
          value={settlementSupportInfo}
          onChange={(e) => setSettlementSupportInfo(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
