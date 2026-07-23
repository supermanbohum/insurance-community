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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface BranchInfoDraft {
  name: string;
  managerName: string;
  address: string;
  addressDetail: string;
  introText: string;
  educationInfo: string;
  welfareInfo: string;
  dbSupportInfo: string;
  settlementSupportInfo: string;
  atmosphereInfo: string;
  plannerCount: string;
  parkingAvailable: boolean | null;
  visitConsultAvailable: boolean | null;
  businessHours: string;
  operationType: 'direct' | 'branch';
  isHeadquarters: boolean;
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
  const [managerName, setManagerName] = useState(branch.manager_name ?? '');
  const [regionId, setRegionId] = useState<string | null>(branch.region_id);
  const [address, setAddress] = useState(branch.address);
  const [addressDetail, setAddressDetail] = useState(branch.address_detail ?? '');
  const [introText, setIntroText] = useState(branch.intro_text ?? '');
  const [educationInfo, setEducationInfo] = useState(branch.education_info ?? '');
  const [welfareInfo, setWelfareInfo] = useState(branch.welfare_info ?? '');
  const [dbSupportInfo, setDbSupportInfo] = useState(branch.db_support_info ?? '');
  const [settlementSupportInfo, setSettlementSupportInfo] = useState(branch.settlement_support_info ?? '');
  const [atmosphereInfo, setAtmosphereInfo] = useState(branch.atmosphere_info ?? '');
  const [plannerCount, setPlannerCount] = useState(branch.planner_count?.toString() ?? '');
  const [parkingAvailable, setParkingAvailable] = useState<boolean | null>(branch.parking_available);
  const [visitConsultAvailable, setVisitConsultAvailable] = useState<boolean | null>(branch.visit_consult_available);
  const [businessHours, setBusinessHours] = useState(branch.business_hours ?? '');
  const [operationType, setOperationType] = useState<'direct' | 'branch'>(branch.operation_type);
  const [isHeadquarters, setIsHeadquarters] = useState(branch.is_headquarters);

  useEffect(() => {
    onDraftChange?.({
      name,
      managerName,
      address,
      addressDetail,
      introText,
      educationInfo,
      welfareInfo,
      dbSupportInfo,
      settlementSupportInfo,
      atmosphereInfo,
      plannerCount,
      parkingAvailable,
      visitConsultAvailable,
      businessHours,
      operationType,
      isHeadquarters,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, managerName, address, addressDetail, introText, educationInfo, welfareInfo, dbSupportInfo, settlementSupportInfo, atmosphereInfo, plannerCount, parkingAvailable, visitConsultAvailable, businessHours, operationType, isHeadquarters]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBranchAction(branch.id, {
        name,
        managerName,
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
        atmosphereInfo,
        plannerCount: plannerCount.trim() ? Number(plannerCount) : null,
        parkingAvailable,
        visitConsultAvailable,
        businessHours,
        operationType,
        isHeadquarters,
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-manager">대표자</Label>
        <Input id="branch-manager" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="지점장/본부장 이름" />
      </div>

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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branch-atmosphere">분위기</Label>
        <Textarea
          id="branch-atmosphere"
          value={atmosphereInfo}
          onChange={(e) => setAtmosphereInfo(e.target.value)}
          rows={3}
          placeholder="근무 분위기, 조직 문화 등"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branch-planner-count">설계사 수</Label>
          <Input
            id="branch-planner-count"
            type="number"
            min={0}
            value={plannerCount}
            onChange={(e) => setPlannerCount(e.target.value)}
            placeholder="예: 45"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branch-business-hours">영업시간</Label>
          <Input
            id="branch-business-hours"
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            placeholder="예: 평일 09:00-18:00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>주차 가능 여부</Label>
          <Select
            value={parkingAvailable === null ? 'unset' : String(parkingAvailable)}
            onValueChange={(v) => setParkingAvailable(v === 'unset' ? null : v === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">미설정</SelectItem>
              <SelectItem value="true">가능</SelectItem>
              <SelectItem value="false">불가능</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>방문 상담 가능 여부</Label>
          <Select
            value={visitConsultAvailable === null ? 'unset' : String(visitConsultAvailable)}
            onValueChange={(v) => setVisitConsultAvailable(v === 'unset' ? null : v === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">미설정</SelectItem>
              <SelectItem value="true">가능</SelectItem>
              <SelectItem value="false">불가능</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
