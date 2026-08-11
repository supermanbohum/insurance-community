'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Camera, FileText, ImagePlus, ScanFace, Star, VideoIcon, X } from 'lucide-react';
import {
  submitBranchRegistrationAction,
  saveIncompleteBranchRegistrationAction,
  uploadRegistrationDocumentAction,
  savePartnerBranchLinksAction,
  uploadPartnerBranchPhotoAction,
  uploadPartnerBranchVideoAction,
  saveBranchRegistrationDraftAction,
} from '@/lib/actions/partner';
import { trackBranchRegisterComplete } from '@/lib/analytics/track';
import type { RegionRow } from '@/lib/admin/branch';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { GaSearchSelect } from '@/components/auth/GaSearchSelect';
import { AddressSearchField, type AddressValue } from '@/components/admin/AddressSearchField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { triggerHaptic } from '@/lib/native/haptics';
import { cn } from '@/lib/utils';

// W-087 - 가입 관리자 7명 중 5명(71%)이 지점 등록을 시작만 하고 이탈했다(임시저장
// 흔적조차 0건). 원인은 요건이 아니라 "한 화면에 사진 6개가 한꺼번에 보이는" 구조
// 였다(오너 확정: 사진 요건은 완화하지 않는다 - 순서와 저장 방식만 바꾼다).
// 3단계 마법사로 재구성: 텍스트 정보 → 필수 서류 → 사진(맨 뒤로 이동).
const STEPS = [
  { step: 1, label: '텍스트 정보' },
  { step: 2, label: '필수 서류' },
  { step: 3, label: '사진' },
] as const;

const PLANNER_COUNT_OPTIONS = [
  { value: 10, label: '10명 이하' },
  { value: 20, label: '20명 이하' },
  { value: 30, label: '30명 이하' },
  { value: 50, label: '50명 이하' },
  { value: 100, label: '100명 이하' },
  { value: 101, label: '100명 이상' },
] as const;

const TAGLINE_PLACEHOLDER = '예: 신입 정착률이 높은 지점 / 2030 설계사 환영 / DB 지원';
const MIN_INTRO_LENGTH = 50;
// 🔴 승인 함수(review_branch_registration, 0100)가 image_office < 5를 거부한다.
// 폼이 이보다 느슨하면 3~4장으로 제출은 되는데 승인은 영구히 안 되는 상태가 만들어지고,
// 사용자는 왜 반려되는지 알 수 없다. 이 값은 DB 검증과 반드시 같아야 한다.
const MIN_OFFICE_PHOTOS = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 1500;

// W-087③ - 사진 없이도 등록을 저장하고 나중에 이어서 완성하는 경로. 백엔드(RPC/마이그레이션)는
// 준비됐지만, "사진 없이 등록 가능"이 요건 완화로 오독될 수 있어 오너 설명 후 켜기로 했다
// (CTO 지시) - 이 상수 하나만 true로 바꾸면 배포 없이 바로 켤 수 있는 구조로 만들어뒀다.
const ALLOW_INCOMPLETE_SUBMIT = false;

// 오너 지정 5개, 순서 그대로. 임의로 늘리거나 순서를 바꾸지 말 것.
const OTHER_TITLE = '기타(직접 입력)';
const TITLE_OPTIONS = ['대표', '본부장', '사업단장', '지점장', OTHER_TITLE] as const;

const REGISTRANT_FIELDS = [
  { key: 'name', label: '등록자 성함' },
  { key: 'title', label: '직책' },
  { key: 'phone', label: '연락처' },
  { key: 'branchLabel', label: '지점명' },
] as const;

const LINK_FIELDS = [
  { key: 'instagram', label: '📷 인스타그램', placeholder: 'https://instagram.com/...' },
  { key: 'blog', label: '📝 블로그', placeholder: 'https://blog.naver.com/...' },
  { key: 'youtube', label: '▶ 유튜브', placeholder: 'https://youtube.com/...' },
  { key: 'website', label: '🌐 홈페이지', placeholder: 'https://...' },
  { key: 'etc', label: '🔗 기타 링크', placeholder: 'https://...' },
] as const;

interface AmenityOption {
  key: 'parkingAvailable' | 'visitConsultAvailable' | 'newRecruitTraining' | 'experiencedHire' | 'dbSupport' | 'settlementSupport';
  label: string;
}

const AMENITIES: AmenityOption[] = [
  { key: 'parkingAvailable', label: '무료 주차 가능' },
  { key: 'visitConsultAvailable', label: '방문 상담 가능' },
  { key: 'newRecruitTraining', label: '신입 교육 가능' },
  { key: 'experiencedHire', label: '경력 채용' },
  { key: 'dbSupport', label: 'DB 제공' },
  { key: 'settlementSupport', label: '정착지원금' },
];

const PHOTO_GUIDE_FRAMES = ['간판', '외관', '내부', '상담 공간'];

export interface RegistrationDraftPayload {
  registrant?: Partial<Record<(typeof REGISTRANT_FIELDS)[number]['key'], string>>;
  gaCompanyId?: string | null;
  regionId?: string | null;
  addressValue?: Partial<AddressValue>;
  tagline?: string;
  introText?: string;
  plannerCount?: number | '';
  amenities?: Partial<Record<AmenityOption['key'], boolean>>;
  links?: Partial<Record<(typeof LINK_FIELDS)[number]['key'], string>>;
}

export function OnboardingForm({
  regions,
  gaOptions,
  initialDraft,
  signupContact,
  signupGaCompanyId,
}: {
  regions: RegionRow[];
  gaOptions: GaFilterOption[];
  initialDraft?: RegistrationDraftPayload | null;
  /** W-087⑤(SPEC-W061③) - 회원가입 때 이미 받은 값이다. 등록 폼에서 다시 빈 채로
   * 묻지 않고 미리 채워서 보여준다(수정은 계속 가능). */
  signupContact?: string | null;
  signupGaCompanyId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasDraft = Boolean(
    initialDraft &&
      (initialDraft.registrant?.name ||
        initialDraft.gaCompanyId ||
        initialDraft.addressValue?.address ||
        initialDraft.tagline ||
        initialDraft.introText)
  );
  const [showDraftBanner, setShowDraftBanner] = useState(hasDraft);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [registrant, setRegistrant] = useState<Record<(typeof REGISTRANT_FIELDS)[number]['key'], string>>({
    name: initialDraft?.registrant?.name ?? '',
    title: initialDraft?.registrant?.title ?? '',
    phone: initialDraft?.registrant?.phone ?? signupContact ?? '',
    branchLabel: initialDraft?.registrant?.branchLabel ?? '',
  });
  const [businessCard, setBusinessCard] = useState<File | null>(null);
  const [gaCompanyId, setGaCompanyId] = useState<string | null>(initialDraft?.gaCompanyId ?? signupGaCompanyId ?? null);
  const gaName = gaOptions.find((g) => g.id === gaCompanyId)?.name ?? '';
  const [regionId, setRegionId] = useState<string | null>(initialDraft?.regionId ?? null);
  const [addressValue, setAddressValue] = useState<AddressValue>({
    address: initialDraft?.addressValue?.address ?? '',
    addressDetail: initialDraft?.addressValue?.addressDetail ?? '',
    zonecode: initialDraft?.addressValue?.zonecode ?? '',
    lat: initialDraft?.addressValue?.lat ?? null,
    lng: initialDraft?.addressValue?.lng ?? null,
  });
  const [tagline, setTagline] = useState(initialDraft?.tagline ?? '');
  const [introText, setIntroText] = useState(initialDraft?.introText ?? '');
  const [plannerCount, setPlannerCount] = useState<number | ''>(initialDraft?.plannerCount ?? '');
  // 🔴 임시저장을 이어서 열 때, 저장된 직책이 목록에 없으면(예전에 자유 입력으로 저장된
  // 값이거나 "기타"로 넣은 값) select가 빈칸이 되면서 사용자가 이미 적어둔 직책이
  // 사라진 것처럼 보인다. 그런 값은 "기타"로 열어 입력칸에 그대로 남겨준다.
  const [titleIsCustom, setTitleIsCustom] = useState(() => {
    const saved = initialDraft?.registrant?.title ?? '';
    return Boolean(saved) && !TITLE_OPTIONS.includes(saved as (typeof TITLE_OPTIONS)[number]);
  });
  const [amenities, setAmenities] = useState<Record<AmenityOption['key'], boolean>>({
    parkingAvailable: initialDraft?.amenities?.parkingAvailable ?? false,
    visitConsultAvailable: initialDraft?.amenities?.visitConsultAvailable ?? false,
    newRecruitTraining: initialDraft?.amenities?.newRecruitTraining ?? false,
    experiencedHire: initialDraft?.amenities?.experiencedHire ?? false,
    dbSupport: initialDraft?.amenities?.dbSupport ?? false,
    settlementSupport: initialDraft?.amenities?.settlementSupport ?? false,
  });
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [officePhotos, setOfficePhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [links, setLinks] = useState<Record<(typeof LINK_FIELDS)[number]['key'], string>>({
    instagram: initialDraft?.links?.instagram ?? '',
    blog: initialDraft?.links?.blog ?? '',
    youtube: initialDraft?.links?.youtube ?? '',
    website: initialDraft?.links?.website ?? '',
    etc: initialDraft?.links?.etc ?? '',
  });
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // W-087① - "아무도 임시저장 버튼을 안 눌렀다"(5명 전원 draft 0건). 버튼을 없애고
  // 텍스트 입력이 멈추면 조용히 자동저장한다(사진/서류 파일은 여전히 저장 대상이
  // 아니다 - 브라우저 File 객체는 그대로 보관할 수 없어 제출 시 다시 첨부해야 한다).
  const skipFirstAutosave = useRef(true);
  useEffect(() => {
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveBranchRegistrationDraftAction({
        registrant,
        gaCompanyId,
        regionId,
        addressValue,
        tagline,
        introText,
        plannerCount,
        amenities,
        links,
      }).then((result) => {
        if (result.success) setDraftSavedAt(new Date());
      });
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrant, gaCompanyId, regionId, addressValue, tagline, introText, plannerCount, amenities, links]);

  const introRemaining = MIN_INTRO_LENGTH - introText.trim().length;
  const registrantComplete = REGISTRANT_FIELDS.every((f) => registrant[f.key].trim());
  const step1Complete = Boolean(gaName && addressValue.address && tagline.trim() && introText.trim().length >= MIN_INTRO_LENGTH && registrantComplete);
  // 임대차계약서는 더 이상 받지 않는다(오너 지시). 승인도 명함만 본다(0100).
  const step2Complete = Boolean(businessCard);
  const canSubmit = step1Complete && step2Complete && Boolean(mainPhoto) && officePhotos.length >= MIN_OFFICE_PHOTOS;

  function pickMainPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('jpg, png, webp 형식만 업로드할 수 있습니다.');
      return;
    }
    setMainPhoto(file);
  }

  function pickDoc(files: FileList | null, setFile: (f: File) => void) {
    const file = files?.[0];
    if (!file) return;
    if (!DOC_TYPES.includes(file.type)) {
      toast.error('jpg, png, webp, pdf 형식만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일은 최대 10MB까지 업로드할 수 있습니다.');
      return;
    }
    setFile(file);
  }

  function addOfficePhotos(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => IMAGE_TYPES.includes(f.type));
    if (accepted.length < files.length) {
      toast.error('jpg, png, webp 형식만 업로드할 수 있습니다.');
    }
    // 상한 없음(오너 지시 2026-08-11) - 0099/0100도 상한 검사를 두지 않는다.
    setOfficePhotos((prev) => [...prev, ...accepted]);
  }

  function removeOfficePhoto(index: number) {
    setOfficePhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function moveOfficePhoto(index: number, direction: -1 | 1) {
    setOfficePhotos((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function pickVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) {
      toast.error('mp4, mov, webm 형식만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error('영상은 최대 200MB까지 업로드할 수 있습니다.');
      return;
    }
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(probe.src);
      if (probe.duration < 30 || probe.duration > 120) {
        toast.info('30초~2분 분량의 영상을 권장합니다. 그대로 업로드는 진행됩니다.');
      }
    };
    probe.src = URL.createObjectURL(file);
    setVideo(file);
  }

  function goToStep(target: 1 | 2 | 3) {
    if (target === 2 && !step1Complete) return;
    if (target === 3 && (!step1Complete || !step2Complete)) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function runSubmit() {
    const result = await submitBranchRegistrationAction({
      gaName,
      registrant: { ...registrant, company: gaName },
      branch: {
        name: registrant.branchLabel,
        regionId,
        address: addressValue.address,
        addressDetail: addressValue.addressDetail,
        lat: addressValue.lat,
        lng: addressValue.lng,
        introText,
        tagline,
        plannerCount: plannerCount === '' ? null : plannerCount,
        ...amenities,
      },
    });

    if (!result.success) {
      toast.error(result.error);
      triggerHaptic('error');
      return;
    }

    // 서류는 명함 1개다(임대차계약서를 더 이상 받지 않는다). 여기 숫자가 실제 업로드
    // 횟수보다 크면 진행률이 100%에 도달하지 못하고 멈춘 것처럼 보인다.
    const totalSteps = (mainPhoto ? 1 : 0) + officePhotos.length + 1 + (video ? 1 : 0);
    setUploadProgress({ done: 0, total: totalSteps });

    if (mainPhoto) {
      const mainFd = new FormData();
      mainFd.set('file', mainPhoto);
      await uploadPartnerBranchPhotoAction(result.branchId, mainFd, true, 0);
      setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
    }

    for (let i = 0; i < officePhotos.length; i++) {
      const fd = new FormData();
      fd.set('file', officePhotos[i]);
      // eslint-disable-next-line no-await-in-loop
      await uploadPartnerBranchPhotoAction(result.branchId, fd, false, i);
      setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
    }

    const cardFd = new FormData();
    cardFd.set('file', businessCard!);
    await uploadRegistrationDocumentAction(result.registrationId, 'business_card', cardFd);
    setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));

    if (video) {
      const fd = new FormData();
      fd.set('file', video);
      await uploadPartnerBranchVideoAction(result.branchId, fd);
      setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
    }

    const linkEntries = Object.entries(links)
      .filter(([, url]) => url.trim())
      .map(([type, url]) => ({ type, url }));
    if (linkEntries.length > 0) {
      await savePartnerBranchLinksAction(result.branchId, linkEntries);
    }

    triggerHaptic('success');
    trackBranchRegisterComplete();
    router.push(`/partner/register/complete?branchId=${result.branchId}`);
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !mainPhoto || !businessCard) return;
    startTransition(runSubmit);
  }

  // W-087③(게이트 꺼짐) - 지금 있는 파일만이라도 올리고, 없는 건 나중에 이어서 채운다.
  async function runSaveIncomplete() {
    const result = await saveIncompleteBranchRegistrationAction({
      gaName,
      registrant: { ...registrant, company: gaName },
      branch: {
        name: registrant.branchLabel,
        regionId,
        address: addressValue.address,
        addressDetail: addressValue.addressDetail,
        lat: addressValue.lat,
        lng: addressValue.lng,
        introText,
        tagline,
        plannerCount: plannerCount === '' ? null : plannerCount,
        ...amenities,
      },
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (mainPhoto) {
      const fd = new FormData();
      fd.set('file', mainPhoto);
      await uploadPartnerBranchPhotoAction(result.branchId, fd, true, 0);
    }
    for (let i = 0; i < officePhotos.length; i++) {
      const fd = new FormData();
      fd.set('file', officePhotos[i]);
      // eslint-disable-next-line no-await-in-loop
      await uploadPartnerBranchPhotoAction(result.branchId, fd, false, i);
    }
    if (businessCard) {
      const fd = new FormData();
      fd.set('file', businessCard);
      await uploadRegistrationDocumentAction(result.registrationId, 'business_card', fd);
    }

    toast.success('등록을 저장했습니다. 남은 사진은 나중에 이어서 올릴 수 있습니다.');
    router.push('/partner');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {showDraftBanner && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span>이전에 작성하던 내용을 이어서 불러왔습니다.</span>
          <button type="button" onClick={() => setShowDraftBanner(false)} className="shrink-0 text-brand-600 hover:underline">
            확인
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.step} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => goToStep(s.step)}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                step === s.step
                  ? 'bg-brand-600 text-white'
                  : step > s.step
                    ? 'bg-brand-100 text-brand-600'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {s.step}
            </button>
            <span className={cn('text-xs font-medium', step === s.step ? 'text-ink' : 'text-muted-foreground')}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={cn('h-px flex-1', step > s.step ? 'bg-brand-300' : 'bg-line')} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">등록자 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                실제 지점 확인 및 허위·중복 등록 방지를 위해 등록자 정보를 입력해주세요. 운영팀 승인 참고자료로만 사용됩니다.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onb-ga-select">소속 GA</Label>
                <GaSearchSelect options={gaOptions} value={gaCompanyId} onChange={setGaCompanyId} placeholder="소속 GA를 검색하세요" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REGISTRANT_FIELDS.map((field) =>
                  field.key === 'title' ? (
                    // 직책은 오너가 정한 5개 중에서 고른다(자유 입력이면 표기가 제각각이라
                    // 나중에 집계도 검증도 안 된다). "기타"만 직접 입력을 열어준다.
                    // 저장은 그대로 registrant.title 한 값으로 간다 - DB 컬럼은 그대로다.
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <Label htmlFor="onb-registrant-title">{field.label}</Label>
                      <select
                        id="onb-registrant-title"
                        value={titleIsCustom ? OTHER_TITLE : registrant.title}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next === OTHER_TITLE) {
                            setTitleIsCustom(true);
                            setRegistrant((prev) => ({ ...prev, title: '' }));
                          } else {
                            setTitleIsCustom(false);
                            setRegistrant((prev) => ({ ...prev, title: next }));
                          }
                        }}
                        className="h-10 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-300"
                        required
                      >
                        <option value="">선택해주세요</option>
                        {TITLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {titleIsCustom && (
                        <Input
                          aria-label="직책 직접 입력"
                          placeholder="직책을 입력해주세요"
                          value={registrant.title}
                          onChange={(e) => setRegistrant((prev) => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      )}
                    </div>
                  ) : (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <Label htmlFor={`onb-registrant-${field.key}`}>{field.label}</Label>
                      <Input
                        id={`onb-registrant-${field.key}`}
                        value={registrant[field.key]}
                        onChange={(e) => setRegistrant((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        required
                      />
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">주소 검색</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
              <AddressSearchField value={addressValue} onChange={setAddressValue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">한 줄 소개</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <Label htmlFor="onb-tagline">지도와 목록에 함께 노출되는 짧고 강한 소개 (최대 30자)</Label>
              <Input
                id="onb-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, 30))}
                placeholder={TAGLINE_PLACEHOLDER}
                required
              />
              <p className="text-right text-xs text-muted-foreground">{tagline.length}/30</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onb-intro">지점 소개 (최소 {MIN_INTRO_LENGTH}자)</Label>
                <p className="text-xs text-muted-foreground">지점의 분위기, 장점, 교육, 복지 등을 자유롭게 소개해주세요.</p>
                <Textarea id="onb-intro" value={introText} onChange={(e) => setIntroText(e.target.value)} rows={5} />
                <p className={cn('text-right text-xs', introRemaining > 0 ? 'text-destructive' : 'text-brand-600')}>
                  {introRemaining > 0 ? `${introRemaining}자 더 입력해주세요` : `${introText.trim().length}자 입력됨`}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>설계사 수</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PLANNER_COUNT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPlannerCount(opt.value)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                        plannerCount === opt.value
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-line bg-white text-ink-soft hover:border-brand-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* 🔴 오너 확정 문구. 부드럽게 다듬지 말 것 - 허위 기재의 결과를
                    분명히 말하는 것이 이 문장의 목적이다. */}
                <p className="text-xs text-muted-foreground">
                  사실과 맞지 않은 정보 기재 시 지점 폐쇄 및 사이트 차단 등 불이익이 있을 수 있습니다
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>추가하면 좋은 정보</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {AMENITIES.map((amenity) => (
                    <div key={amenity.key} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                      <Label htmlFor={`onb-amenity-${amenity.key}`} className="cursor-pointer font-normal">
                        {amenity.label}
                      </Label>
                      <Switch
                        id={`onb-amenity-${amenity.key}`}
                        checked={amenities[amenity.key]}
                        onCheckedChange={(checked) => setAmenities((prev) => ({ ...prev, [amenity.key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SNS 및 외부 링크 (선택)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {LINK_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`onb-link-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`onb-link-${field.key}`}
                    type="url"
                    value={links[field.key]}
                    onChange={(e) => setLinks((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {draftSavedAt ? `${draftSavedAt.toLocaleTimeString('ko-KR')}에 자동저장됨` : ''}
            </span>
            <Button type="button" onClick={() => goToStep(2)} disabled={!step1Complete} size="lg">
              다음: 필수 서류
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">필수 서류</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* 임대차계약서 칸을 지웠다(오너 지시). 승인 함수도 명함만 본다(0100).
                  🔴 남은 칸이 하나뿐이라 2열 그리드를 1열로 되돌린다 - 그대로 두면
                  명함 칸이 화면 절반만 차지하고 옆이 비어 잘린 것처럼 보인다. */}
              <p className="text-xs text-muted-foreground">
                등록자 명함을 첨부해주세요. 실제 지점 확인 및 운영팀 승인에만 사용되며 외부에 노출되지 않습니다.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>등록자 명함</Label>
                  {businessCard ? (
                    <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm">
                      <span className="flex items-center gap-1.5 truncate text-ink-soft">
                        <ScanFace className="h-4 w-4 shrink-0" />
                        <span className="truncate">{businessCard.name}</span>
                      </span>
                      <button type="button" onClick={() => setBusinessCard(null)} aria-label="명함 삭제">
                        <X className="h-4 w-4 text-ink-faint" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
                      <ScanFace className="h-4 w-4" />
                      파일 선택 (jpg/png/pdf)
                      <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickDoc(e.target.files, setBusinessCard)} />
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => goToStep(1)}>
              이전
            </Button>
            <Button type="button" onClick={() => goToStep(3)} disabled={!step2Complete} size="lg">
              다음: 사진
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card className="border-brand-200 bg-brand-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Camera className="h-4 w-4" />
                무엇을 찍어야 하나요?
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {PHOTO_GUIDE_FRAMES.map((frame) => (
                  <div key={frame} className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-brand-200 bg-white py-3 text-center">
                    <Camera className="h-4 w-4 text-brand-400" />
                    <span className="text-xs font-medium text-ink-soft">{frame}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm font-semibold text-brand-700">지금 계신 사무실에서 3분이면 됩니다.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">대표사진 (필수, 1장)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">목록/지도/검색결과에 썸네일로 노출되는 사진입니다.</p>
              {mainPhoto ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(mainPhoto)} alt="대표사진" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <Star className="h-2.5 w-2.5 fill-white" />
                    대표사진
                  </span>
                  <button
                    type="button"
                    onClick={() => setMainPhoto(null)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="대표사진 삭제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickMainPhoto(e.dataTransfer.files);
                  }}
                >
                  <ImagePlus className="h-6 w-6" />
                  대표사진을 드래그하거나 눌러서 선택하세요
                  <input type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => pickMainPhoto(e.target.files)} />
                </label>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">사무실 사진 (필수, 최소 {MIN_OFFICE_PHOTOS}장)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                대표사진과 별도로, 지점 상세페이지에서만 노출되는 사무실 사진을 최소 {MIN_OFFICE_PHOTOS}장 이상 등록해주세요.
              </p>

              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600',
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addOfficePhotos(e.dataTransfer.files);
                }}
              >
                <ImagePlus className="h-6 w-6" />
                사진을 드래그하거나 눌러서 선택하세요 ({officePhotos.length}장 선택됨)
                <input
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  multiple
                  className="hidden"
                  onChange={(e) => addOfficePhotos(e.target.files)}
                />
              </label>

              {officePhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {officePhotos.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(file)} alt={`사무실 사진 ${i + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => moveOfficePhoto(i, -1)} disabled={i === 0} className="p-1 text-white disabled:opacity-30" aria-label="앞으로 이동">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => moveOfficePhoto(i, 1)} disabled={i === officePhotos.length - 1} className="p-1 text-white disabled:opacity-30" aria-label="뒤로 이동">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => removeOfficePhoto(i)} className="p-1 text-white" aria-label="삭제">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className={cn('text-xs', officePhotos.length >= MIN_OFFICE_PHOTOS ? 'text-brand-600' : 'text-destructive')}>
                {officePhotos.length}/{MIN_OFFICE_PHOTOS}장 이상 필요
              </p>
              {/* 🔴 오너 확정 문구(표기만 "올릴 수 록" → "올릴수록"으로 교정, 내용은 그대로).
                  상한을 지운 자리에 "많이 올리면 좋다"는 이유를 대신 둔다. */}
              <p className="text-xs text-muted-foreground">
                실제 사무실 사진을 많이 올릴수록 조회율이 높습니다
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">홍보 영상 (선택)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                사무실 소개 또는 분위기를 보여주는 영상을 등록하면 더 많은 문의를 받을 수 있습니다. (mp4/mov/webm, 최대 1개, 30초~2분 권장)
              </p>
              {video ? (
                <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
                  <video src={URL.createObjectURL(video)} controls className="aspect-video w-full" />
                  <button
                    type="button"
                    onClick={() => setVideo(null)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="영상 삭제"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
                  <VideoIcon className="h-6 w-6" />
                  영상을 선택하세요
                  <input type="file" accept={VIDEO_TYPES.join(',')} className="hidden" onChange={(e) => pickVideo(e.target.files)} />
                </label>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => goToStep(2)} disabled={isPending}>
              이전
            </Button>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              {ALLOW_INCOMPLETE_SUBMIT && !canSubmit && (
                <Button type="button" variant="outline" disabled={isPending} onClick={() => startTransition(runSaveIncomplete)}>
                  사진 없이 우선 등록하기
                </Button>
              )}
              <Button type="submit" disabled={isPending || !canSubmit} size="lg">
                {isPending
                  ? uploadProgress && uploadProgress.total > 0
                    ? `업로드 중... (${uploadProgress.done}/${uploadProgress.total})`
                    : '제출 중...'
                  : '등록 신청'}
              </Button>
            </div>
          </div>
          {!canSubmit && !isPending && (
            <p className="text-center text-xs text-muted-foreground">대표사진 1장과 사무실사진 {MIN_OFFICE_PHOTOS}장 이상을 등록해주세요.</p>
          )}
        </>
      )}
    </form>
  );
}
