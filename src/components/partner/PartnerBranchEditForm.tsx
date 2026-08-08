'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  submitBranchChangeAction,
  submitBranchTrustUpdateAction,
  saveBranchUpdateDraftAction,
  uploadPendingBranchPhotoAction,
} from '@/lib/actions/partner';
import { deleteBranchMediaAction } from '@/lib/actions/branch-media-admin';
import type { BranchRow, InsurerRow, RegionRow, BranchContactRow, BranchRecruitRow, BranchMediaRow } from '@/lib/admin/branch';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { InsurerMultiSelect } from '@/components/admin/InsurerMultiSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { ImagePlus, Star, Trash2, Clock, FileEdit } from 'lucide-react';

export interface OpenBranchRegistration {
  status: 'draft' | 'pending';
  registrant: { name: string; title: string; phone: string; company: string; branchLabel: string };
  payload: Record<string, unknown>;
}

function payloadString(payload: Record<string, unknown>, key: string, fallback: string): string {
  const v = payload[key];
  return typeof v === 'string' ? v : fallback;
}
function payloadBoolean(payload: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = payload[key];
  return typeof v === 'boolean' ? v : fallback;
}

const REGISTRANT_FIELDS = [
  { key: 'name', label: '등록자 성함' },
  { key: 'title', label: '직책' },
  { key: 'phone', label: '연락처' },
  { key: 'company', label: '회사 소속' },
  { key: 'branchLabel', label: '본부 또는 지점명' },
] as const;

const MAX_PENDING_PHOTOS = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PartnerBranchEditForm({
  branch,
  regions,
  insurers,
  selectedInsurerIds,
  contacts,
  activeRecruit,
  media,
  imageBaseUrl,
  openRegistration,
}: {
  branch: BranchRow;
  regions: RegionRow[];
  insurers: InsurerRow[];
  selectedInsurerIds: string[];
  contacts: BranchContactRow[];
  activeRecruit: BranchRecruitRow | null;
  media: BranchMediaRow[];
  imageBaseUrl: string;
  /** 작성중(draft)이거나 승인대기(pending) 중인 신뢰도 항목 수정 요청 - 있으면 그 내용을
   * 그대로 불러와 "이어서 작성"할 수 있게 한다. 언제든 수정 후 재제출 가능하다. */
  openRegistration: OpenBranchRegistration | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSubmittingTrust, startTrustTransition] = useTransition();
  const [isSavingDraft, startDraftTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const router = useRouter();
  const p = openRegistration?.payload ?? {};

  // 이미 승인된 사진(pending_registration_id가 없는 것)만 현재 공개 상태로 보여준다.
  const images = media.filter((m) => (m.media_type === 'image_main' || m.media_type === 'image_office') && !m.pending_registration_id);

  // --- 즉시 반영 항목 (연락처/취급보험사/채용) ---
  const [insurerIds, setInsurerIds] = useState(selectedInsurerIds);
  const [phone, setPhone] = useState(contacts.find((c) => c.type === 'phone')?.value ?? '');
  const [kakao, setKakao] = useState(contacts.find((c) => c.type === 'kakao')?.value ?? '');
  const [homepage, setHomepage] = useState(contacts.find((c) => c.type === 'homepage')?.value ?? '');
  const [recruitOpen, setRecruitOpen] = useState(Boolean(activeRecruit));
  const [recruitTitle, setRecruitTitle] = useState(activeRecruit?.title ?? '');
  const [recruitContent, setRecruitContent] = useState(activeRecruit?.content ?? '');

  // --- 신뢰도 항목 (운영팀 승인 필요) - 작성중/대기중인 요청이 있으면 그 내용을 우선
  // 불러온다("이어서 작성"), 없으면 현재 공개된 지점 값에서 시작한다. ---
  const [registrant, setRegistrant] = useState<Record<(typeof REGISTRANT_FIELDS)[number]['key'], string>>({
    name: openRegistration?.registrant.name ?? '',
    title: openRegistration?.registrant.title ?? '',
    phone: openRegistration?.registrant.phone ?? '',
    company: openRegistration?.registrant.company ?? '',
    branchLabel: openRegistration?.registrant.branchLabel ?? '',
  });
  const [name, setName] = useState(payloadString(p, 'name', branch.name));
  const [regionId, setRegionId] = useState<string | null>(
    typeof p.regionId === 'string' ? p.regionId : branch.region_id
  );
  const [address, setAddress] = useState(payloadString(p, 'address', branch.address));
  const [addressDetail, setAddressDetail] = useState(payloadString(p, 'addressDetail', branch.address_detail ?? ''));
  const [introText, setIntroText] = useState(payloadString(p, 'introText', branch.intro_text ?? ''));
  const [educationInfo, setEducationInfo] = useState(payloadString(p, 'educationInfo', branch.education_info ?? ''));
  const [welfareInfo, setWelfareInfo] = useState(payloadString(p, 'welfareInfo', branch.welfare_info ?? ''));
  const [dbSupportInfo, setDbSupportInfo] = useState(payloadString(p, 'dbSupportInfo', branch.db_support_info ?? ''));
  const [settlementSupportInfo, setSettlementSupportInfo] = useState(
    payloadString(p, 'settlementSupportInfo', branch.settlement_support_info ?? '')
  );
  const [plannerCount, setPlannerCount] = useState(
    typeof p.plannerCount === 'number' ? String(p.plannerCount) : (branch.planner_count?.toString() ?? '')
  );
  const [parkingAvailable, setParkingAvailable] = useState(payloadBoolean(p, 'parkingAvailable', branch.parking_available ?? false));
  const [visitConsultAvailable, setVisitConsultAvailable] = useState(
    payloadBoolean(p, 'visitConsultAvailable', branch.visit_consult_available ?? false)
  );
  const [businessHours, setBusinessHours] = useState(payloadString(p, 'businessHours', branch.business_hours ?? ''));
  const [newOfficePhotos, setNewOfficePhotos] = useState<File[]>([]);
  const registrantComplete = REGISTRANT_FIELDS.every((f) => registrant[f.key].trim());

  function trustPayload() {
    return {
      name,
      regionId,
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
    };
  }

  function handleSaveDraft() {
    startDraftTransition(async () => {
      const result = await saveBranchUpdateDraftAction(branch.id, registrant, trustPayload());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDraftSavedAt(new Date());
      toast.success('임시저장되었습니다.');
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitBranchChangeAction(branch.id, {
        insurers: { insurerIds },
        contacts: { phone, kakao, homepage },
        recruit: recruitOpen
          ? { action: 'open', title: recruitTitle, content: recruitContent }
          : activeRecruit
            ? { action: 'close' }
            : undefined,
      });
      if (result.success) {
        toast.success('저장되었습니다.');
      } else {
        toast.error(result.error);
      }
    });
  }

  function addNewOfficePhotos(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => IMAGE_TYPES.includes(f.type));
    if (accepted.length < files.length) {
      toast.error('jpg, png, webp 형식만 업로드할 수 있습니다.');
    }
    setNewOfficePhotos((prev) => [...prev, ...accepted].slice(0, MAX_PENDING_PHOTOS));
  }

  function handleTrustSubmit() {
    if (!registrantComplete || !name.trim() || !address.trim()) {
      toast.error('등록자 정보와 지점명/주소를 모두 입력해주세요.');
      return;
    }
    startTrustTransition(async () => {
      const result = await submitBranchTrustUpdateAction(branch.id, registrant, trustPayload());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      for (const file of newOfficePhotos) {
        const fd = new FormData();
        fd.set('file', file);
        // eslint-disable-next-line no-await-in-loop
        await uploadPendingBranchPhotoAction(branch.id, result.registrationId, fd, false);
      }
      toast.success(
        openRegistration?.status === 'pending' ? '수정 내용이 다시 제출되었습니다. 운영팀이 최신 내용을 검토합니다.' : '승인 요청이 접수되었습니다. 운영팀 승인 후 반영됩니다.'
      );
      setNewOfficePhotos([]);
      router.refresh();
    });
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
    <div className="flex flex-col gap-6">
      <Card className="border-brand-200 bg-brand-50/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">신뢰도 항목 수정 (운영팀 승인 필요)</CardTitle>
            {openRegistration?.status === 'pending' ? (
              <Badge variant="warning" className="gap-1 text-[11px]">
                <Clock className="h-3 w-3" />
                승인 대기 중
              </Badge>
            ) : openRegistration?.status === 'draft' ? (
              <Badge variant="outline" className="gap-1 text-[11px]">
                <FileEdit className="h-3 w-3" />
                임시저장됨
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            이름/주소/지역/소개글/설계사수/편의시설/사진은 제출 즉시 반영되지 않고, 운영팀 승인 후에 실제 지점 페이지에 반영됩니다.
            {openRegistration?.status === 'pending' && ' 이미 검토 대기 중인 수정 요청이 있습니다 - 지금 수정해서 다시 제출하면 관리자는 최신 내용만 검토합니다.'}
            {openRegistration?.status === 'draft' && ' 이전에 임시저장한 내용을 불러왔습니다. 이어서 작성 후 제출해주세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">등록자 정보</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {REGISTRANT_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`pbe-registrant-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`pbe-registrant-${field.key}`}
                    value={registrant[field.key]}
                    onChange={(e) => setRegistrant((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                     />
                </div>
              ))}
            </div>
          </div>

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
              <Input
                id="pbe-planner-count"
                type="number"
                min={0}
                value={plannerCount}
                onChange={(e) => setPlannerCount(e.target.value)}
                             />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pbe-hours">운영시간</Label>
              <Input
                id="pbe-hours"
                placeholder="평일 09:00-18:00"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                             />
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
            <Textarea
              id="pbe-settlement"
              value={settlementSupportInfo}
              onChange={(e) => setSettlementSupportInfo(e.target.value)}
              rows={3}
                         />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">사무실 사진 추가 (승인 필요)</Label>
            <p className="text-xs text-muted-foreground">새로 추가하는 사무실 사진은 운영팀 승인 후 상세페이지에 노출됩니다.</p>
            {newOfficePhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {newOfficePhotos.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewOfficePhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-brand-300 hover:text-brand-600">
              <ImagePlus className="h-4 w-4" />
              사진 선택
              <input type="file" accept={IMAGE_TYPES.join(',')} multiple className="hidden" onChange={(e) => addNewOfficePhotos(e.target.files)} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || isSubmittingTrust}>
              {isSavingDraft ? '저장 중...' : '임시저장'}
            </Button>
            <Button type="button" onClick={handleTrustSubmit} disabled={isSubmittingTrust || isSavingDraft} size="lg">
              {isSubmittingTrust ? '제출 중...' : openRegistration?.status === 'pending' ? '수정 내용 다시 제출' : '승인 요청 제출'}
            </Button>
            {draftSavedAt && (
              <span className="text-xs text-muted-foreground">{draftSavedAt.toLocaleTimeString('ko-KR')}에 임시저장됨</span>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">지점 사진</CardTitle>
            <CardDescription>현재 공개 중인 사진입니다. 대표사진은 정확히 1장이며, 새 사진 추가는 위 승인 요청으로 처리됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {images.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">등록된 사진이 없습니다.</p>
            )}
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

        <p className="text-xs text-muted-foreground">연락처/취급보험사/채용정보는 저장 즉시 반영됩니다.</p>
        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? '저장 중...' : '저장'}
        </Button>
      </form>
    </div>
  );
}
