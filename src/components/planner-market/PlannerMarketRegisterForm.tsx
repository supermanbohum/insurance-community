'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import {
  submitPlannerMarketProfileAction,
  updatePlannerMarketProfileAction,
  savePlannerTrustUpdateDraftAction,
  uploadPlannerMarketPhotoAction,
} from '@/lib/actions/planner-market';
import type { RegionRow } from '@/lib/admin/branch';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { GaSearchSelect } from '@/components/auth/GaSearchSelect';
import { PlannerMarketConsentCheckboxes, EMPTY_CONSENTS, type PlannerMarketConsents } from '@/components/planner-market/PlannerMarketConsentCheckboxes';
import { trackPlannerRegisterComplete } from '@/lib/analytics/track';
import { normalizeImageFiles, HEIC_ACCEPT } from '@/lib/images/heic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { JOB_SEARCH_STATUS_LABEL, DESIRED_START_TIMING_LABEL, CONTACTABLE_TIME_LABEL } from '@/lib/planner-market/labels';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type JobSearchStatus = keyof typeof JOB_SEARCH_STATUS_LABEL;
type DesiredStartTiming = keyof typeof DESIRED_START_TIMING_LABEL;
type ContactableTime = keyof typeof CONTACTABLE_TIME_LABEL;

const JOB_SEARCH_STATUS_OPTIONS = Object.keys(JOB_SEARCH_STATUS_LABEL) as JobSearchStatus[];
const DESIRED_START_TIMING_OPTIONS = Object.keys(DESIRED_START_TIMING_LABEL) as DesiredStartTiming[];
const CONTACTABLE_TIME_OPTIONS = Object.keys(CONTACTABLE_TIME_LABEL) as ContactableTime[];

/** 단일선택 필드(현재 상태/희망 입사 시기)가 공유하는 pill 버튼 그룹. */
function PillSingleSelect<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
            value === opt ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-ink-soft hover:border-brand-200'
          )}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export interface PlannerMarketEditableProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  kakaoId: string | null;
  profilePhotoPath: string | null;
  profilePhotoUrl: string | null;
  photoPublic: boolean | null;
  activeRegionId: string;
  careerYears: number;
  specialties: string[];
  currentlyEmployed: boolean;
  jobSearchStatus: 'actively_looking' | 'open_to_offers' | 'not_looking';
  desiredStartTiming: 'immediate' | 'within_1_month' | 'within_3_months' | 'negotiable' | null;
  contactableTimes: string[];
  selfIntroduction: string | null;
  desiredRegionId: string | null;
  desiredGaCompanyId: string | null;
  desiredConditions: string | null;
}

/** 등록 폼과 수정 폼을 겸한다 - initialProfile이 있으면 수정 모드(동의 카드 숨김,
 * updatePlannerMarketProfileAction 호출), 없으면 신규 등록 모드다. */
export function PlannerMarketRegisterForm({
  regions,
  gaOptions,
  initialProfile,
}: {
  regions: RegionRow[];
  gaOptions: GaFilterOption[];
  initialProfile?: PlannerMarketEditableProfile;
}) {
  const router = useRouter();
  const isEditMode = Boolean(initialProfile);
  const [isPending, startTransition] = useTransition();
  const [isSavingDraft, startDraftTransition] = useTransition();
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(initialProfile?.profilePhotoUrl ?? null);
  const [photoPublic, setPhotoPublic] = useState<boolean | null>(initialProfile?.photoPublic ?? null);
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [phone, setPhone] = useState(initialProfile?.phone ?? '');
  const [email, setEmail] = useState(initialProfile?.email ?? '');
  const [kakaoId, setKakaoId] = useState(initialProfile?.kakaoId ?? '');
  const [activeRegionId, setActiveRegionId] = useState<string | null>(initialProfile?.activeRegionId ?? null);
  const [careerYears, setCareerYears] = useState<number | ''>(initialProfile?.careerYears ?? '');
  const [specialtiesText, setSpecialtiesText] = useState(initialProfile?.specialties.join(', ') ?? '');
  const [currentlyEmployed, setCurrentlyEmployed] = useState(initialProfile?.currentlyEmployed ?? false);
  const [jobSearchStatus, setJobSearchStatus] = useState<JobSearchStatus | null>(
    (initialProfile?.jobSearchStatus as JobSearchStatus | undefined) ?? null
  );
  const [desiredStartTiming, setDesiredStartTiming] = useState<DesiredStartTiming | null>(
    (initialProfile?.desiredStartTiming as DesiredStartTiming | null | undefined) ?? null
  );
  const [contactableTimes, setContactableTimes] = useState<ContactableTime[]>(
    (initialProfile?.contactableTimes as ContactableTime[] | undefined) ?? []
  );
  const [selfIntroduction, setSelfIntroduction] = useState(initialProfile?.selfIntroduction ?? '');
  const [desiredRegionId, setDesiredRegionId] = useState<string | null>(initialProfile?.desiredRegionId ?? null);
  const [desiredGaCompanyId, setDesiredGaCompanyId] = useState<string | null>(initialProfile?.desiredGaCompanyId ?? null);
  const [desiredConditions, setDesiredConditions] = useState(initialProfile?.desiredConditions ?? '');
  const [consents, setConsents] = useState<PlannerMarketConsents>(EMPTY_CONSENTS);

  const allConsented = isEditMode || Object.values(consents).every(Boolean);
  const hasPhoto = Boolean(photo || existingPhotoUrl);
  const canSubmit =
    name.trim() &&
    phone.trim() &&
    email.trim() &&
    activeRegionId &&
    careerYears !== '' &&
    jobSearchStatus &&
    allConsented &&
    (!hasPhoto || photoPublic !== null);

  function toggleContactableTime(time: ContactableTime) {
    setContactableTimes((prev) => (prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]));
  }

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    // 아이폰 HEIC → JPEG 변환(오너 지시 2026-08-18). 실패는 조용히 버리지 않는다.
    const { ok, failed } = await normalizeImageFiles([file]);
    if (failed.length > 0) {
      toast.error(`${failed[0].name}: ${failed[0].reason}`);
      return;
    }
    const picked = ok[0];
    if (!IMAGE_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp, 아이폰 사진(HEIC)만 업로드할 수 있습니다.');
      return;
    }
    setPhoto(picked);
    setPhotoPublic(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !activeRegionId || !jobSearchStatus) return;
    if (hasPhoto && photoPublic === null) {
      toast.error('프로필 사진 공개 여부를 선택해주세요.');
      return;
    }

    startTransition(async () => {
      let profilePhotoPath: string | null = existingPhotoUrl ? (initialProfile?.profilePhotoPath ?? null) : null;
      if (photo) {
        const fd = new FormData();
        fd.set('file', photo);
        const uploadResult = await uploadPlannerMarketPhotoAction(fd);
        if (!uploadResult.success) {
          toast.error(uploadResult.error);
          return;
        }
        profilePhotoPath = uploadResult.path;
      }

      const input = {
        name,
        phone,
        email,
        kakaoId,
        profilePhotoPath,
        photoPublic: profilePhotoPath ? photoPublic : null,
        activeRegionId,
        careerYears: Number(careerYears),
        specialties: specialtiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        currentlyEmployed,
        jobSearchStatus,
        desiredStartTiming,
        contactableTimes,
        selfIntroduction,
        desiredRegionId,
        desiredGaCompanyId,
        desiredConditions,
      };

      const result = isEditMode
        ? await updatePlannerMarketProfileAction(initialProfile!.id, input)
        : await submitPlannerMarketProfileAction(input, consents);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditMode ? '수정되었습니다. 활동지역/경력/희망GA 변경은 운영팀 승인 후 반영됩니다.' : '설계사 등록 신청이 접수되었습니다. 운영팀 승인 후 공개됩니다.');
      if (!isEditMode) {
        trackPlannerRegisterComplete();
      }
      router.push('/planner-market/my');
      router.refresh();
    });
  }

  function handleSaveDraft() {
    if (!initialProfile) return;
    startDraftTransition(async () => {
      const result = await savePlannerTrustUpdateDraftAction(initialProfile.id, {
        activeRegionId,
        careerYears: careerYears === '' ? null : careerYears,
        desiredGaCompanyId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDraftSavedAt(new Date());
      toast.success('임시저장되었습니다.');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필 사진 (선택)</CardTitle>
        </CardHeader>
        <CardContent>
          {photo || existingPhotoUrl ? (
            <div className="relative h-28 w-28 overflow-hidden rounded-full border border-line bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo ? URL.createObjectURL(photo) : existingPhotoUrl!} alt="프로필 사진" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setExistingPhotoUrl(null);
                  setPhotoPublic(null);
                }}
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="사진 삭제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-line text-center text-xs text-muted-foreground hover:border-brand-300 hover:text-brand-600">
              <ImagePlus className="h-5 w-5" />
              사진 선택
              <input type="file" accept={`${IMAGE_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pickPhoto(e.target.files)} />
            </label>
          )}
          {hasPhoto && (
            <div className="mt-4 flex flex-col gap-1.5">
              <Label>연봉랭킹 사진 공개 여부</Label>
              <p className="text-xs text-muted-foreground">
                이 사진은 연봉랭킹에 선정될 경우에만 노출 여부에 사용됩니다. 비공개를 선택하면 어떤 방법으로도 볼 수 없습니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoPublic(true)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                    photoPublic === true ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-ink-soft hover:border-brand-200'
                  )}
                >
                  공개
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoPublic(false)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                    photoPublic === false ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-ink-soft hover:border-brand-200'
                  )}
                >
                  비공개
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">비공개 정보 (연락처)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">이름/연락처/이메일/카카오톡은 GA가 열람권을 사용해야만 볼 수 있습니다.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm-name">이름</Label>
              <Input id="pm-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm-phone">연락처</Label>
              <Input id="pm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm-email">이메일</Label>
              <Input id="pm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm-kakao">카카오톡 ID (선택)</Label>
              <Input id="pm-kakao" value={kakaoId} onChange={(e) => setKakaoId(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">공개 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>활동지역</Label>
            <RegionSelect regions={regions} value={activeRegionId} onChange={setActiveRegionId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-career">경력 (년)</Label>
            <Input
              id="pm-career"
              type="number"
              min={0}
              value={careerYears}
              onChange={(e) => setCareerYears(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-specialties">전문분야 (쉼표로 구분)</Label>
            <Input id="pm-specialties" value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)} placeholder="예: 종신보험, 변액보험, 손해사정" />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="pm-employed" className="cursor-pointer font-normal">
              현재 근무 여부
            </Label>
            <Switch id="pm-employed" checked={currentlyEmployed} onCheckedChange={setCurrentlyEmployed} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>현재 상태</Label>
            <PillSingleSelect options={JOB_SEARCH_STATUS_OPTIONS} labels={JOB_SEARCH_STATUS_LABEL} value={jobSearchStatus} onChange={setJobSearchStatus} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>희망 입사 시기</Label>
            <PillSingleSelect
              options={DESIRED_START_TIMING_OPTIONS}
              labels={DESIRED_START_TIMING_LABEL}
              value={desiredStartTiming}
              onChange={setDesiredStartTiming}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>연락 가능 시간</Label>
            <div className="flex flex-wrap gap-3">
              {CONTACTABLE_TIME_OPTIONS.map((time) => (
                <label key={time} className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-soft">
                  <Checkbox checked={contactableTimes.includes(time)} onCheckedChange={() => toggleContactableTime(time)} />
                  {CONTACTABLE_TIME_LABEL[time]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-intro">자기소개</Label>
            <Textarea id="pm-intro" value={selfIntroduction} onChange={(e) => setSelfIntroduction(e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">희망 조건 (선택)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>희망 근무지역</Label>
            <RegionSelect regions={regions} value={desiredRegionId} onChange={setDesiredRegionId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-desired-ga">희망 GA</Label>
            <GaSearchSelect options={gaOptions} value={desiredGaCompanyId} onChange={setDesiredGaCompanyId} placeholder="희망 GA를 검색하세요" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pm-conditions">희망 조건</Label>
            <Textarea id="pm-conditions" value={desiredConditions} onChange={(e) => setDesiredConditions(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      {!isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">필수 동의</CardTitle>
          </CardHeader>
          <CardContent>
            <PlannerMarketConsentCheckboxes consents={consents} onChange={setConsents} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isEditMode && (
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || isPending}>
            {isSavingDraft ? '저장 중...' : '활동지역/경력/희망GA 임시저장'}
          </Button>
        )}
        <Button type="submit" disabled={isPending || !canSubmit} size="lg">
          {isPending ? '저장 중...' : isEditMode ? '수정 저장' : '설계사 등록 신청'}
        </Button>
        {draftSavedAt && <span className="text-xs text-muted-foreground">{draftSavedAt.toLocaleTimeString('ko-KR')}에 임시저장됨</span>}
      </div>
      {!canSubmit && !isPending && (
        <p className="text-center text-xs text-muted-foreground">
          이름/연락처/이메일/활동지역/경력/현재 상태{isEditMode ? '' : '와 모든 필수 동의 항목'}을 입력해주세요.
        </p>
      )}
      {isEditMode && (
        <p className="text-center text-xs text-muted-foreground">
          연락처/사진/자기소개 등은 저장 즉시 반영됩니다. 활동지역/경력/희망GA 변경은 운영팀 승인 후 반영됩니다.
        </p>
      )}
    </form>
  );
}
