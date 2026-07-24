'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { submitBranchChangeAction, submitBranchMainImageAction } from '@/lib/actions/partner';
import type { BranchRow, InsurerRow, RegionRow, BranchContactRow, BranchRecruitRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { InsurerMultiSelect } from '@/components/admin/InsurerMultiSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlus } from 'lucide-react';

export function PartnerBranchEditForm({
  branch,
  regions,
  insurers,
  selectedInsurerIds,
  contacts,
  activeRecruit,
}: {
  branch: BranchRow;
  regions: RegionRow[];
  insurers: InsurerRow[];
  selectedInsurerIds: string[];
  contacts: BranchContactRow[];
  activeRecruit: BranchRecruitRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(branch.name);
  const [regionId, setRegionId] = useState<string | null>(branch.region_id);
  const [address, setAddress] = useState(branch.address);
  const [addressDetail, setAddressDetail] = useState(branch.address_detail ?? '');
  const [introText, setIntroText] = useState(branch.intro_text ?? '');
  const [educationInfo, setEducationInfo] = useState(branch.education_info ?? '');
  const [welfareInfo, setWelfareInfo] = useState(branch.welfare_info ?? '');
  const [dbSupportInfo, setDbSupportInfo] = useState(branch.db_support_info ?? '');
  const [settlementSupportInfo, setSettlementSupportInfo] = useState(branch.settlement_support_info ?? '');
  const [plannerCount, setPlannerCount] = useState(branch.planner_count?.toString() ?? '');
  const [parkingAvailable, setParkingAvailable] = useState(branch.parking_available ?? false);
  const [visitConsultAvailable, setVisitConsultAvailable] = useState(branch.visit_consult_available ?? false);
  const [businessHours, setBusinessHours] = useState(branch.business_hours ?? '');
  const [insurerIds, setInsurerIds] = useState(selectedInsurerIds);

  const [phone, setPhone] = useState(contacts.find((c) => c.type === 'phone')?.value ?? '');
  const [kakao, setKakao] = useState(contacts.find((c) => c.type === 'kakao')?.value ?? '');
  const [homepage, setHomepage] = useState(contacts.find((c) => c.type === 'homepage')?.value ?? '');

  const [recruitOpen, setRecruitOpen] = useState(Boolean(activeRecruit));
  const [recruitTitle, setRecruitTitle] = useState(activeRecruit?.title ?? '');
  const [recruitContent, setRecruitContent] = useState(activeRecruit?.content ?? '');

  function notify() {
    toast.success('저장되었습니다.');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitBranchChangeAction(branch.id, {
        name,
        address,
        addressDetail,
        introText,
        educationInfo,
        welfareInfo,
        dbSupportInfo,
        settlementSupportInfo,
        plannerCount: plannerCount ? Number(plannerCount) : null,
        parkingAvailable,
        visitConsultAvailable,
        businessHours,
        insurers: { insurerIds },
        contacts: { phone, kakao, homepage },
        recruit: recruitOpen
          ? { action: 'open', title: recruitTitle, content: recruitContent }
          : activeRecruit
            ? { action: 'close' }
            : undefined,
      });
      if (result.success) {
        notify();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleImageSelect(file: File | undefined) {
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.set('file', file);
    submitBranchMainImageAction(branch.id, formData)
      .then((result) => {
        if (result.success) {
          notify();
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setUploadingImage(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">대표 이미지</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {isUploadingImage ? '업로드 중...' : '대표 이미지 교체'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-name">지점명</Label>
            <Input id="pbe-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-address">주소</Label>
            <Input id="pbe-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-address-detail">상세주소</Label>
            <Input id="pbe-address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pbe-planner-count">설계사 수</Label>
              <Input id="pbe-planner-count" type="number" min={0} value={plannerCount} onChange={(e) => setPlannerCount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pbe-hours">운영시간</Label>
              <Input id="pbe-hours" placeholder="평일 09:00-18:00" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="pbe-parking" className="cursor-pointer font-normal">주차 가능</Label>
            <Switch id="pbe-parking" checked={parkingAvailable} onCheckedChange={setParkingAvailable} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="pbe-visit" className="cursor-pointer font-normal">방문 상담 가능</Label>
            <Switch id="pbe-visit" checked={visitConsultAvailable} onCheckedChange={setVisitConsultAvailable} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">소개 · 안내</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-intro">회사소개</Label>
            <Textarea id="pbe-intro" value={introText} onChange={(e) => setIntroText(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-education">교육 안내</Label>
            <Textarea id="pbe-education" value={educationInfo} onChange={(e) => setEducationInfo(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-welfare">복지 안내</Label>
            <Textarea id="pbe-welfare" value={welfareInfo} onChange={(e) => setWelfareInfo(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-db">DB지원 안내</Label>
            <Textarea id="pbe-db" value={dbSupportInfo} onChange={(e) => setDbSupportInfo(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-settlement">정착지원 안내</Label>
            <Textarea id="pbe-settlement" value={settlementSupportInfo} onChange={(e) => setSettlementSupportInfo(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">취급 원수사</CardTitle>
        </CardHeader>
        <CardContent>
          <InsurerMultiSelect insurers={insurers} selectedIds={insurerIds} onChange={setInsurerIds} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">연락처</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-phone">대표전화</Label>
            <Input id="pbe-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-kakao">카카오톡 채널 URL</Label>
            <Input id="pbe-kakao" value={kakao} onChange={(e) => setKakao(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pbe-homepage">홈페이지</Label>
            <Input id="pbe-homepage" value={homepage} onChange={(e) => setHomepage(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">채용</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="pbe-recruit" className="cursor-pointer font-normal">채용중으로 표시</Label>
            <Switch id="pbe-recruit" checked={recruitOpen} onCheckedChange={setRecruitOpen} />
          </div>
          {recruitOpen && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbe-recruit-title">공고 제목</Label>
                <Input id="pbe-recruit-title" value={recruitTitle} onChange={(e) => setRecruitTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbe-recruit-content">공고 내용</Label>
                <Textarea id="pbe-recruit-content" value={recruitContent} onChange={(e) => setRecruitContent(e.target.value)} rows={3} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
