'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { submitBranchChangeAction } from '@/lib/actions/partner';
import { uploadBranchImageAction, deleteBranchMediaAction } from '@/lib/actions/branch-media-admin';
import type { BranchRow, InsurerRow, RegionRow, BranchContactRow, BranchRecruitRow, BranchMediaRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { InsurerMultiSelect } from '@/components/admin/InsurerMultiSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { ImagePlus, Star, Trash2 } from 'lucide-react';

export function PartnerBranchEditForm({
  branch,
  regions,
  insurers,
  selectedInsurerIds,
  contacts,
  activeRecruit,
  media,
  imageBaseUrl,
}: {
  branch: BranchRow;
  regions: RegionRow[];
  insurers: InsurerRow[];
  selectedInsurerIds: string[];
  contacts: BranchContactRow[];
  activeRecruit: BranchRecruitRow | null;
  media: BranchMediaRow[];
  imageBaseUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // sort_order 오름차순으로 이미 정렬되어 오므로 첫 사진이 곧 대표사진이다.
  const images = media.filter((m) => m.media_type === 'image_main' || m.media_type === 'image_office');

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

  function handleImageSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    const uploads = Array.from(files).map((file) => {
      const formData = new FormData();
      formData.set('file', file);
      return uploadBranchImageAction(branch.id, branch.ga_company_id, formData);
    });

    Promise.all(uploads)
      .then((results) => {
        const failed = results.find((r) => !r.success);
        if (failed && !failed.success) {
          toast.error(failed.error);
        } else {
          toast.success('사진을 업로드했습니다.');
        }
        router.refresh();
      })
      .finally(() => setUploadingImage(false));
  }

  function handleDeleteImage(item: BranchMediaRow) {
    setDeletingId(item.id);
    deleteBranchMediaAction(item.id, branch.id, 'branch-images')
      .then((result) => {
        if (result.success) {
          toast.success('삭제했습니다.');
          router.refresh();
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setDeletingId(null));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">지점 사진</CardTitle>
          <CardDescription>가장 먼저 업로드한 사진이 자동으로 대표사진이 됩니다. 대표사진을 삭제하면 다음 사진이 대표사진이 됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${imageBaseUrl}/${item.value}`} alt="" className="h-full w-full object-cover" />
                  {item.media_type === 'image_main' && (
                    <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      대표사진
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => handleDeleteImage(item)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files)}
          />
          <Button type="button" variant="outline" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {isUploadingImage ? '업로드 중...' : '사진 추가'}
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
