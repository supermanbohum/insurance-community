'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  submitBranchChangeAction,
  submitBranchTrustUpdateAction,
  saveBranchUpdateDraftAction,
  uploadPendingBranchPhotoAction,
  setBranchOperationTypeAction,
} from '@/lib/actions/partner';
import type { GaOperationType } from '@/types/database';
import { cn } from '@/lib/utils';
import { deleteBranchMediaAction, setBranchMainMediaAction } from '@/lib/actions/branch-media-admin';
import { normalizeImageFiles, HEIC_ACCEPT } from '@/lib/images/heic';
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
import { SHORT_TAGLINE_MAX_LENGTH, SHORT_TAGLINE_HELP } from '@/lib/branch/short-tagline';

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

/** 🔴 등록 폼(OnboardingForm)과 같은 라벨·설명을 쓴다. 두 곳이 다르면 "등록할 때 본 것과
 *  수정할 때 보는 것"이 달라진다. 화면 5곳이 렌더하는 「직영」/「지사」와도 같아야 한다. */
const OPERATION_TYPE_OPTIONS = [
  { value: 'branch' as const, label: '지사', desc: '본사와 별개로 운영하는 지사·대리점' },
  { value: 'direct' as const, label: '직영', desc: '본사가 직접 운영하는 지점' },
];

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
  const [settingMainId, setSettingMainId] = useState<string | null>(null);
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
  const [shortTagline, setShortTagline] = useState(payloadString(p, 'shortTagline', branch.short_tagline ?? ''));
  // 🔴 이 값은 승인 큐를 타지 않는다. payload가 아니라 현재 저장값에서 읽고, 바꾸는 즉시
  // 서버에 쓴다 - 아래 카드 주석 참고.
  const [operationType, setOperationType] = useState<GaOperationType>(branch.operation_type);
  const [savingOperationType, setSavingOperationType] = useState(false);

  function changeOperationType(next: GaOperationType) {
    if (next === operationType || savingOperationType) return;
    const previous = operationType;
    setOperationType(next); // 낙관적 반영 - 실패하면 되돌린다
    setSavingOperationType(true);
    setBranchOperationTypeAction(branch.id, next)
      .then((result) => {
        if (result.success) {
          toast.success(`${next === 'direct' ? '직영' : '지사'}으로 변경되었습니다.`);
          router.refresh();
        } else {
          setOperationType(previous);
          toast.error(result.error);
        }
      })
      .finally(() => setSavingOperationType(false));
  }
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
      // 🔴 승인 큐를 탄다(즉시 반영 아님). 공개 카드에 그대로 나가는 문구라 심사가 필요하다.
      // 빈 문자열도 그대로 보낸다 - review_branch_registration이 "지운다"로 처리한다(0108).
      shortTagline,
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
    // 🔴 「채용중으로 표시」만 켜고 제목·내용이 비면 서버 RPC가 INVALID_INPUT 으로 400 을 낸다.
    //    실제 사고(2026-08-27): 그 400 이 조용히 삼켜져서 지점 관리자는 이유를 모른 채
    //    저장을 네 번 반복했다. 보내기 전에 여기서 막고 무엇이 빠졌는지 말한다.
    if (recruitOpen && (!recruitTitle.trim() || !recruitContent.trim())) {
      toast.error('채용중으로 표시하려면 공고 제목과 내용을 모두 입력해주세요.');
      return;
    }
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

  async function addNewOfficePhotos(files: FileList | null) {
    if (!files) return;
    // 아이폰 HEIC → JPEG 변환(오너 지시 2026-08-18). 실패는 파일명과 함께 띄운다.
    const { ok, failed } = await normalizeImageFiles(Array.from(files));
    const accepted = ok.filter((f) => IMAGE_TYPES.includes(f.type));
    const rejectedCount = failed.length + (ok.length - accepted.length);
    if (rejectedCount > 0) {
      toast.error(`${rejectedCount}장을 추가하지 못했습니다.`, {
        description: [
          ...failed.map((f) => `${f.name}: ${f.reason}`),
          ...ok.filter((f) => !IMAGE_TYPES.includes(f.type)).map((f) => `${f.name}: jpg, png, webp, 아이폰 사진(HEIC)만 가능`),
        ].join('\n'),
      });
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
      // 🔴 예전에는 이 루프가 결과를 버리고 **무조건 성공 토스트**를 띄웠다. 사진이
      // 하나도 안 올라가도 "접수되었습니다"가 떴다는 뜻이다. 실패는 실패로 말한다.
      const failed: string[] = [];
      for (const file of newOfficePhotos) {
        const fd = new FormData();
        fd.set('file', file);
        // eslint-disable-next-line no-await-in-loop
        const uploaded = await uploadPendingBranchPhotoAction(branch.id, result.registrationId, fd, false);
        if (!uploaded.success) failed.push(`${file.name}: ${uploaded.error ?? '업로드하지 못했습니다'}`);
      }
      toast.success(
        openRegistration?.status === 'pending' ? '수정 내용이 다시 제출되었습니다. 운영팀이 최신 내용을 검토합니다.' : '승인 요청이 접수되었습니다. 운영팀 승인 후 반영됩니다.'
      );
      if (failed.length > 0) {
        // 본문(수정 내용)은 실제로 제출됐으므로 위 성공 토스트는 그대로 두고,
        // 사진만 따로 실패를 알린다 - 어느 쪽이 안 됐는지 구분되어야 다시 시도할 수 있다.
        toast.error(`사진 ${failed.length}장이 첨부되지 않았습니다. 다시 올려주세요.`, {
          description: failed.join('\n'),
        });
      }
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

  /** 🔴 대표사진 교체. 승인 큐를 타지 않고 즉시 반영된다 —
   *  이미 공개 중인 사진들 사이의 순서만 바꾸는 일이라 새로 심사할 내용이 없다. */
  function handleSetMain(item: BranchMediaRow) {
    setSettingMainId(item.id);
    setBranchMainMediaAction(item.id)
      .then((result) => {
        if (result.success) {
          toast.success('대표사진을 바꿨습니다.');
          router.refresh();
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setSettingMainId(null));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 🔴 이 카드는 아래 「신뢰도 항목 수정(운영팀 승인 필요)」과 **다른 규칙**이다.
          직영/지사는 **승인 없이 즉시 반영**된다(오너 지시 2026-08-13) - 잘못 고른 지점이
          있을 수 있으니 언제든 스스로 바꿀 수 있어야 한다.
          ⚠️ 그래서 아래 저장 버튼에 묶지 않고 여기서 바로 쓴다. 같은 버튼에 묶으면
          "저장했는데 어떤 건 반영되고 어떤 건 대기"가 되어 설명할 수 없다. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">운영 형태</CardTitle>
          <CardDescription>
            선택하면 <b>바로 반영</b>됩니다. 승인 절차가 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {OPERATION_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={savingOperationType}
                onClick={() => changeOperationType(option.value)}
                aria-pressed={operationType === option.value}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-60',
                  operationType === option.value
                    ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-line bg-white hover:border-brand-200'
                )}
              >
                <span className={cn('text-sm font-bold', operationType === option.value ? 'text-brand-700' : 'text-ink')}>
                  {option.label}
                </span>
                <span className="text-xs leading-snug text-ink-faint">{option.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            지점 상세·검색·지도에 「{operationType === 'direct' ? '직영' : '지사'}」로 표시됩니다.
          </p>
        </CardContent>
      </Card>

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
            <Label htmlFor="pbe-short-tagline">짧은 소개 (선택)</Label>
            <Input
              id="pbe-short-tagline"
              value={shortTagline}
              onChange={(e) => setShortTagline(e.target.value.slice(0, SHORT_TAGLINE_MAX_LENGTH))}
              maxLength={SHORT_TAGLINE_MAX_LENGTH}
            />
            <p className="text-xs text-muted-foreground">
              {SHORT_TAGLINE_HELP} · {shortTagline.trim().length}/{SHORT_TAGLINE_MAX_LENGTH}
            </p>
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
              <input type="file" accept={`${IMAGE_TYPES.join(',')},${HEIC_ACCEPT}`} multiple className="hidden" onChange={(e) => addNewOfficePhotos(e.target.files)} />
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
            <CardDescription>
              현재 공개 중인 사진입니다. 대표사진을 바꾸려면 원하는 사진 위에서 <b>대표로 지정</b>을 누르세요 — <b>바로 반영되고 사진을 지울 필요가 없습니다.</b> 새 사진 추가는 위 승인 요청으로 처리됩니다.
            </CardDescription>
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
                    {/* 🔴 0118 - 대표사진을 지우지 않고 바꾸는 유일한 수단. 없으면 순서를 맞추려 사진을 지우게 된다. */}
                    {item.media_type !== 'image_main' && (
                      <button
                        type="button"
                        disabled={settingMainId !== null}
                        onClick={() => handleSetMain(item)}
                        className="absolute inset-x-1 bottom-1 rounded-md bg-black/70 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="이 사진을 대표사진으로 지정"
                      >
                        {settingMainId === item.id ? '바꾸는 중…' : '대표로 지정'}
                      </button>
                    )}
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
