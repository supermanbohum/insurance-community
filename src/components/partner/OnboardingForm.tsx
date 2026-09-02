'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
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
import { BranchDetailView } from '@/components/branch/BranchDetailView';
import { NewBranchCard } from '@/components/home/carousel/NewBranchCard';
import type { BranchPreviewData } from '@/components/branch/types';
import type { PublicBranchSummary, GaOperationType } from '@/types/database';
import { triggerHaptic } from '@/lib/native/haptics';
import { normalizeImageFiles, HEIC_ACCEPT } from '@/lib/images/heic';
import {
  SHORT_TAGLINE_MAX_LENGTH,
  SHORT_TAGLINE_HELP,
  normalizeShortTagline,
  fitsShortTaglineInCard,
} from '@/lib/branch/short-tagline';
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

/** 🔴 라벨은 이미 화면 5곳이 쓰는 것과 같아야 한다(지점 상세·지점 카드·지도 미리보기·
 *  지도 바텀시트·지도 목록이 전부 「직영」/「지사」로 렌더한다). 여기서만 다른 말을 쓰면
 *  고른 것과 보이는 것이 달라진다. */
const OPERATION_TYPE_OPTIONS = [
  { value: 'branch' as const, label: '지사', desc: '본사와 별개로 운영하는 지사·대리점' },
  { value: 'direct' as const, label: '직영', desc: '본사가 직접 운영하는 지점' },
];

const PHOTO_GUIDE_FRAMES = ['간판', '외관', '내부', '상담 공간'];

export interface RegistrationDraftPayload {
  registrant?: Partial<Record<(typeof REGISTRANT_FIELDS)[number]['key'], string>>;
  gaCompanyId?: string | null;
  regionId?: string | null;
  addressValue?: Partial<AddressValue>;
  tagline?: string;
  shortTagline?: string;
  operationType?: GaOperationType;
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
  lockGaCompany,
}: {
  regions: RegionRow[];
  gaOptions: GaFilterOption[];
  initialDraft?: RegistrationDraftPayload | null;
  /** W-087⑤(SPEC-W061③) - 회원가입 때 이미 받은 값이다. 등록 폼에서 다시 빈 채로
   * 묻지 않고 미리 채워서 보여준다(수정은 계속 가능). */
  signupContact?: string | null;
  signupGaCompanyId?: string | null;
  /** 🔴 이미 소속 GA가 있는 계정의 **추가 지점 등록**(0119). GA를 바꾸지 못하게 잠근다 —
   *  다른 GA 이름으로 넘기면 RPC가 GA_NAME_MISMATCH 로 막으므로, 애초에 못 고르게 하는 게 맞다. */
  lockGaCompany?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasDraft = Boolean(
    initialDraft &&
      (initialDraft.registrant?.name ||
        initialDraft.gaCompanyId ||
        initialDraft.addressValue?.address ||
        initialDraft.tagline ||
        initialDraft.shortTagline ||
        initialDraft.introText)
  );
  const [showDraftBanner, setShowDraftBanner] = useState(hasDraft);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPreview, setShowPreview] = useState(false);

  const [registrant, setRegistrant] = useState<Record<(typeof REGISTRANT_FIELDS)[number]['key'], string>>({
    name: initialDraft?.registrant?.name ?? '',
    title: initialDraft?.registrant?.title ?? '',
    phone: initialDraft?.registrant?.phone ?? signupContact ?? '',
    branchLabel: initialDraft?.registrant?.branchLabel ?? '',
  });
  // 🔴 등록자 연락처 공개 동의(오너 지시 2026-08-13). **기본값은 미체크**다 -
  // 여기 들어가는 번호는 회사 대표번호가 아니라 지점관리자 **개인 휴대폰**이다.
  // 임시저장(draft)에 담지 않는다: 동의는 매번 본인이 직접 눌러야 하는 것이지
  // 예전 세션에서 복원돼 자기도 모르게 켜져 있으면 안 된다.
  const [publishRegistrantPhone, setPublishRegistrantPhone] = useState(false);
  const [businessCard, setBusinessCard] = useState<File | null>(null);
  const [gaCompanyId, setGaCompanyId] = useState<string | null>(
    lockGaCompany ? (signupGaCompanyId ?? null) : (initialDraft?.gaCompanyId ?? signupGaCompanyId ?? null)
  );
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
  const [shortTagline, setShortTagline] = useState(initialDraft?.shortTagline ?? '');
  // 🔴 기본값 'branch'는 DB 기본값과 같다(ga_branch.operation_type default 'branch').
  // 화면이 미리 골라 둔 것처럼 보이지 않게 라디오 두 개를 나란히 두고, 안 고르면
  // 지금까지와 똑같이 「지사」로 저장된다 - 기존 등록 동작이 바뀌지 않는다.
  const [operationType, setOperationType] = useState<GaOperationType>(
    initialDraft?.operationType ?? 'branch'
  );
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
        shortTagline,
        operationType,
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
  }, [registrant, gaCompanyId, regionId, addressValue, tagline, shortTagline, operationType, introText, plannerCount, amenities, links]);

  // 미리보기용 변환. 공개 상세와 같은 컴포넌트에 넘길 수 있도록 아직 저장 전인 폼
  // 상태를 BranchPreviewData 모양으로 맞춘다(관리자 BranchEditWorkspace와 같은 패턴).
  // 🔴 사진은 File이라 URL이 없다 - objectURL로 만들되, 미리보기를 열었을 때만
  // 만들고 닫거나 사진이 바뀌면 revoke한다. 안 그러면 사진을 고칠 때마다 blob이
  // 쌓여 긴 세션에서 메모리를 계속 먹는다.
  const previewMedia = useMemo(() => {
    if (!showPreview) return [];
    const items: { id: string; type: 'image_main' | 'image_office'; source: 'external'; url: string }[] = [];
    if (mainPhoto) items.push({ id: 'preview-main', type: 'image_main', source: 'external', url: URL.createObjectURL(mainPhoto) });
    officePhotos.forEach((f, i) => {
      items.push({ id: `preview-office-${i}`, type: 'image_office', source: 'external', url: URL.createObjectURL(f) });
    });
    return items;
  }, [showPreview, mainPhoto, officePhotos]);

  useEffect(() => {
    return () => {
      previewMedia.forEach((m) => URL.revokeObjectURL(m.url));
    };
  }, [previewMedia]);

  // 미리보기를 열 때 한 번만 고정한다. 매 렌더마다 new Date()를 만들면 값이 계속
  // 바뀌어 불필요한 리렌더가 난다.
  const previewNow = useMemo(() => new Date().toISOString(), [showPreview]);
  const previewRegion = regions.find((r) => r.id === regionId);
  const previewData: BranchPreviewData = {
    name: registrant.branchLabel || '(지점명 미입력)',
    slug: 'preview',
    managerName: null,
    address: addressValue.address,
    addressDetail: addressValue.addressDetail || null,
    sidoName: previewRegion?.sido_name ?? null,
    sigunguName: previewRegion?.sigungu_name ?? null,
    gaBranchCount: 0,
    lat: addressValue.lat,
    lng: addressValue.lng,
    introText: introText || null,
    educationInfo: null,
    welfareInfo: null,
    dbSupportInfo: null,
    settlementSupportInfo: null,
    atmosphereInfo: null,
    plannerCount: plannerCount === '' ? null : plannerCount,
    parkingAvailable: amenities.parkingAvailable,
    visitConsultAvailable: amenities.visitConsultAvailable,
    newRecruitTraining: amenities.newRecruitTraining,
    experiencedHire: amenities.experiencedHire,
    dbSupport: amenities.dbSupport,
    settlementSupport: amenities.settlementSupport,
    businessHours: null,
    tagline: tagline || null,
    shortTagline: normalizeShortTagline(shortTagline),
    operationType,
    // 등록 폼에서 받지 않는 값이라 중립값을 쓴다. 승인 후 운영팀이 정한다.
    isHeadquarters: false,
    updatedAt: previewNow,
    gaCompanyName: gaName,
    gaCompanyLogoUrl: null,
    isGaVerified: false,
    media: previewMedia,
    // 연락처/취급보험사/채용은 등록 폼에서 받지 않는다 - 승인 후 파트너 화면에서 넣는다.
    // 여기서 가짜로 채우면 "미리보기에는 있었는데 공개되면 없다"가 된다.
    contacts: [],
    links: [],
    insurerNames: [],
    activeRecruits: [],
    siblingBranches: [],
    plannerBadges: [],
  };

  /**
   * 홈 목록 카드(190px) 미리보기용 변환.
   *
   * 🔴 왜 필요한가: 상세 미리보기만 보면 **짧은 소개가 항상 보인다.** 목록 카드는 폭이
   * 좁아 지점명이 길면 짧은 소개를 통째로 숨기는데(자르지 않는 규칙), 그 사실이 여기서만
   * 드러난다. 예시로는 안 드러난다 - 예시 지점명이 짧으면 9자가 다 들어가서
   * 「다 보이는구나」를 한 번 더 확인시켜 줄 뿐이다(디자인 판정 2026-08-13).
   *
   * 🔴 실제 목록에 쓰는 그 컴포넌트(NewBranchCard)를 그대로 쓴다. 따로 그리면 폭 계산이
   * 갈려서 「미리보기에선 보였는데 목록엔 없다」가 그대로 재발한다.
   *
   * ⚠️ 카드는 Link라 클릭하면 존재하지 않는 slug로 이동한다. 감싸서 클릭을 막는다.
   */
  const previewSummary: PublicBranchSummary = {
    id: 'preview',
    slug: 'preview',
    gaCompanyId: gaCompanyId ?? '',
    gaCompanyName: gaName,
    gaCompanyLogoUrl: null,
    isGaVerified: false,
    name: registrant.branchLabel || '(지점명 미입력)',
    sidoName: previewRegion?.sido_name ?? null,
    sigunguName: previewRegion?.sigungu_name ?? null,
    address: addressValue.address,
    mainImageUrl: previewMedia.find((m) => m.type === 'image_main')?.url ?? null,
    viewCount: 0,
    isRecommended: false,
    hasNewOpenBadge: false,
    isPro: false,
    createdAt: previewNow,
    updatedAt: previewNow,
    gaBranchCount: 0,
    operationType,
    isHeadquarters: false,
    lat: addressValue.lat,
    lng: addressValue.lng,
    hasActiveRecruit: false,
    kakaoContactHref: null,
    contactClickCount: 0,
    tagline: tagline || null,
    shortTagline: normalizeShortTagline(shortTagline),
    plannerBadgeTotal: 0,
    plannerTopTier: null,
  };

  const introRemaining = MIN_INTRO_LENGTH - introText.trim().length;
  const registrantComplete = REGISTRANT_FIELDS.every((f) => registrant[f.key].trim());
  const step1Complete = Boolean(gaName && addressValue.address && tagline.trim() && introText.trim().length >= MIN_INTRO_LENGTH && registrantComplete);
  // 임대차계약서는 더 이상 받지 않는다(오너 지시). 승인도 명함만 본다(0100).
  const step2Complete = Boolean(businessCard);
  const canSubmit = step1Complete && step2Complete && Boolean(mainPhoto) && officePhotos.length >= MIN_OFFICE_PHOTOS;

  // 아이폰 HEIC는 고르는 즉시 JPEG로 변환해서 state에 담는다(오너 지시 2026-08-18).
  // 제출 시점이 아니라 선택 시점에 변환하는 이유: 미리보기(URL.createObjectURL)가
  // HEIC를 못 그리는 브라우저에서도 변환본은 그려지고, 실패를 그 자리에서 알 수 있다.
  async function pickMainPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
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
    setMainPhoto(picked);
  }

  async function pickDoc(files: FileList | null, setFile: (f: File) => void) {
    const file = files?.[0];
    if (!file) return;
    // 명함도 아이폰으로 찍는 경우가 흔하다 - 같은 변환을 태운다.
    const { ok, failed } = await normalizeImageFiles([file]);
    if (failed.length > 0) {
      toast.error(`${failed[0].name}: ${failed[0].reason}`);
      return;
    }
    const picked = ok[0];
    if (!DOC_TYPES.includes(picked.type)) {
      toast.error('jpg, png, webp, pdf, 아이폰 사진(HEIC)만 업로드할 수 있습니다.');
      return;
    }
    if (picked.size > 10 * 1024 * 1024) {
      toast.error('파일은 최대 10MB까지 업로드할 수 있습니다.');
      return;
    }
    setFile(picked);
  }

  async function addOfficePhotos(files: FileList | null) {
    if (!files) return;
    const { ok, failed } = await normalizeImageFiles(Array.from(files));
    const accepted = ok.filter((f) => IMAGE_TYPES.includes(f.type));
    const rejectedCount = failed.length + (ok.length - accepted.length);
    if (rejectedCount > 0) {
      // 🔴 몇 장이 왜 빠졌는지 말한다 - "10장 올렸는데 9장" 사고의 재발 방지.
      toast.error(`${rejectedCount}장을 추가하지 못했습니다.`, {
        description: [
          ...failed.map((f) => `${f.name}: ${f.reason}`),
          ...ok.filter((f) => !IMAGE_TYPES.includes(f.type)).map((f) => `${f.name}: jpg, png, webp, 아이폰 사진(HEIC)만 가능`),
        ].join('\n'),
      });
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
      publishRegistrantPhone,
      branch: {
        name: registrant.branchLabel,
        regionId,
        address: addressValue.address,
        addressDetail: addressValue.addressDetail,
        lat: addressValue.lat,
        lng: addressValue.lng,
        introText,
        tagline,
        shortTagline,
        operationType,
        plannerCount: plannerCount === '' ? null : plannerCount,
        ...amenities,
      },
    });

    if (!result.success) {
      toast.error(result.error);
      triggerHaptic('error');
      return;
    }

    // 🔴 등록은 성공했는데 짧은 소개만 못 들어간 경우 - 조용히 버리지 않는다.
    // 등록 자체를 되돌리지도 않는다(사진·서류를 다 올린 뒤라 처음부터 다시 하게 된다).
    if (result.shortTaglineFailed) {
      toast.warning('짧은 소개만 저장하지 못했습니다. 지점 정보에서 다시 입력해주세요.');
    }

    // 🔴 "공개하겠다"고 체크했는데 저장이 안 됐으면 반드시 말해야 한다. 조용히 넘어가면
    // 지점장은 번호가 공개된 줄 알고, 방문자에게는 연락 수단이 없다.
    if (result.registrantPhoneShareFailed) {
      toast.warning('연락처 공개 설정만 저장하지 못했습니다. 지점 정보 > 연락처에서 다시 저장해주세요.');
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
        shortTagline,
        operationType,
        plannerCount: plannerCount === '' ? null : plannerCount,
        ...amenities,
      },
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (result.shortTaglineFailed) {
      toast.warning('짧은 소개만 저장하지 못했습니다. 지점 정보에서 다시 입력해주세요.');
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
          {/* 준비물 안내(콘텐츠 확정 문구). 무엇이 필요한지를 3단계에 가서야 알던 구조가
              이탈의 원인이라, 시작 지점에 모아 둔다.
              🔴 순서를 바꾸지 말 것 - "5분이면 끝납니다"가 목록보다 먼저다. 목록이 앞에
              오면 그 자체가 문턱으로 읽힌다. 각 항목의 "왜" 한 줄과 "필요하지 않은 것"도
              같은 이유로 뺄 수 없다.
              🔴 마지막 줄은 약속이라 구현을 확인하고 썼다. 임시저장(0047)은 텍스트 9개
              필드만 저장하고 사진은 저장하지 않는다. 그래서 "작성하신 내용"이 아니라
              "작성하신 글"로, "이어서"가 아니라 "다시 오셔서"로 적었다 - 사진까지
              보관됐다가 이어진다고 읽히면 그건 지킬 수 없는 약속이 된다. */}
          <Card className="border-brand-200 bg-brand-50/60">
            <CardContent className="flex flex-col gap-3 pt-5">
              {/* 🔴 오너 확정(2026-08-11): 사진 가이드의 "3분"과 다르지만 통일하지 말 것.
                  5분은 등록 전체 과정, 3분은 사진 촬영만이다. 오너 원문 "둘다 각각 냅둬". */}
              <p className="text-[15px] font-extrabold tracking-tight text-ink">미리 준비하시면 5분이면 끝납니다</p>
              <ul className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
                <li>· 등록자 명함 — 소속과 직급 확인에 사용합니다</li>
                <li>· 대표 홍보사진 1장 이상</li>
                <li>· 사무실 사진 5장 이상 — 실제 지점임을 확인하는 자료입니다</li>
                <li>· 직책</li>
              </ul>
              <p className="text-[13px] font-semibold text-ink-soft">
                사업자등록증과 임대차계약서는 필요하지 않습니다.
              </p>
              <p className="text-[13px] text-ink-soft">
                지금 사진이 없어도 시작하실 수 있습니다 — 작성하신 글은 저장되니, 사진은 나중에 다시 오셔서
                올리셔도 됩니다.
              </p>
            </CardContent>
          </Card>

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
                {lockGaCompany ? (
                  // 추가 지점 등록(0119): 소속은 이미 정해져 있다. 바꾸면 RPC가 막으므로 고정해서 보여준다.
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-medium">{gaName || '소속 GA'}</span>
                    <span className="ml-2 text-xs text-muted-foreground">이미 소속된 GA로 지점을 추가합니다</span>
                  </div>
                ) : (
                  <GaSearchSelect options={gaOptions} value={gaCompanyId} onChange={setGaCompanyId} placeholder="소속 GA를 검색하세요" />
                )}
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
                      {field.key === 'phone' && (
                        // 🔴 개인 휴대폰이 공개되는 일이다. 기본 미체크이고, 문구에
                        // "공개됩니다"를 그대로 쓴다 - "노출"·"등록" 같은 완곡어를 쓰면
                        // 무엇이 일어나는지 읽는 사람이 알 수 없다.
                        <label
                          htmlFor="onb-registrant-phone-public"
                          className="mt-1 flex cursor-pointer items-start gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2.5"
                        >
                          <input
                            id="onb-registrant-phone-public"
                            type="checkbox"
                            checked={publishRegistrantPhone}
                            onChange={(e) => setPublishRegistrantPhone(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                          />
                          <span className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-bold text-ink">
                              이 번호를 지점 연락처로 공개합니다
                            </span>
                            <span className="text-xs text-ink-faint">
                              체크하면 위 번호가 <b>지점 상세페이지의 「전화하기」 버튼</b>에 그대로
                              공개됩니다. 회사 대표번호가 아니라 <b>본인 번호</b>이니 확인하고 체크해주세요.
                              체크하지 않으면 공개되지 않고, 방문자는 문의 폼으로만 연락할 수 있습니다.
                              등록 후 지점 정보에서 언제든 바꿀 수 있습니다.
                            </span>
                          </span>
                        </label>
                      )}
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

          {/* 직영/지사(오너 지시 2026-08-13).
              등록할 때 고르고, **지점 수정에서 언제든 바꿀 수 있다**(승인 없이 즉시 반영).
              검색·지도 필터와 지도 마커 색(직영 #e0a319 / 지사 #2f6bff)이 이 값을 쓴다. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">운영 형태</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {OPERATION_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOperationType(option.value)}
                    aria-pressed={operationType === option.value}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors',
                      operationType === option.value
                        ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                        : 'border-line bg-white hover:border-brand-200'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-bold',
                        operationType === option.value ? 'text-brand-700' : 'text-ink'
                      )}
                    >
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

          {/* 짧은 소개(0107) - 위 「한 줄 소개」와 **다른 문구**를 받는다. 같은 말을 잘라
              쓰는 칸이 아니다(오너 확정 2026-08-12). 그래서 카드를 따로 두고, 설명에도
              "다른 문구"임을 적는다 - 붙여 놓으면 같은 값을 두 번 적게 된다. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                짧은 소개 <span className="text-xs font-medium text-muted-foreground">(선택)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <Label htmlFor="onb-short-tagline">{SHORT_TAGLINE_HELP}</Label>
              <Input
                id="onb-short-tagline"
                value={shortTagline}
                onChange={(e) => setShortTagline(e.target.value.slice(0, SHORT_TAGLINE_MAX_LENGTH))}
                placeholder="신입 환영"
                maxLength={SHORT_TAGLINE_MAX_LENGTH}
              />
              <p className="text-xs text-muted-foreground">
                위 「한 줄 소개」와 다른 문구를 적어주세요. 같은 말이면 두 번 보입니다.
              </p>
              <p className="text-right text-xs text-muted-foreground">
                {shortTagline.trim().length}/{SHORT_TAGLINE_MAX_LENGTH}
              </p>
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
                      <input type="file" accept={`${DOC_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pickDoc(e.target.files, setBusinessCard)} />
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
              {/* 🔴 "예시)"가 없으면 이 4칸이 "이 네 장을 올려야 한다"는 요구로 읽힌다.
                  상담 공간이 없는 지점은 여기서 막혔다고 판단하고 나간다.
                  칸 안의 라벨(간판·외관·내부·상담 공간)은 지시 대상이 아니라 그대로 둔다. */}
              <p className="text-xs font-semibold text-ink-faint">예시)</p>
              <div className="grid grid-cols-4 gap-2">
                {PHOTO_GUIDE_FRAMES.map((frame) => (
                  <div key={frame} className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-brand-200 bg-white py-3 text-center">
                    <Camera className="h-4 w-4 text-brand-400" />
                    <span className="text-xs font-medium text-ink-soft">{frame}</span>
                  </div>
                ))}
              </div>
              {/* 🔴 오너 확정(2026-08-11): 준비물 안내의 "5분"과 다르지만 통일하지 말 것.
                  5분은 등록 전체 과정, 3분은 사진 촬영만을 가리킨다. 오너 원문 "둘다 각각 냅둬". */}
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
                  <input type="file" accept={`${IMAGE_TYPES.join(',')},${HEIC_ACCEPT}`} className="hidden" onChange={(e) => pickMainPhoto(e.target.files)} />
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
                  accept={`${IMAGE_TYPES.join(',')},${HEIC_ACCEPT}`}
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
              <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)} disabled={isPending}>
                {showPreview ? '미리보기 닫기' : '미리보기'}
              </Button>
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

          {/* 🔴 공개 지점 상세와 "같은 컴포넌트"를 쓴다(BranchDetailView, variant="preview").
              따로 만들면 실제 공개 화면과 어긋나서 미리보기의 의미가 없어진다 -
              관리자 지점 편집(BranchEditWorkspace)이 이미 쓰는 방식 그대로다.
              사진은 아직 업로드 전이라 File을 objectURL로 만들어 넘긴다. */}
          {showPreview && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                승인되면 이렇게 공개됩니다. 아직 제출 전이며, 이 화면은 저장되지 않습니다.
              </p>
              {/* 목록 카드 먼저 보여준다 - 짧은 소개가 숨는 것은 여기서만 드러난다. */}
              <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-4">
                <p className="text-xs font-semibold text-ink-soft">홈·검색 목록에서는 이렇게 보입니다</p>
                <div className="w-[190px] cursor-default" aria-hidden>
                  {/* 이 카드는 Link다. 미리보기에서는 눌러도 갈 곳이 없으므로 클릭을 막는다. */}
                  <div className="pointer-events-none">
                    <NewBranchCard branch={previewSummary} />
                  </div>
                </div>
                {shortTagline.trim() &&
                  !fitsShortTaglineInCard(previewSummary.name, previewSummary.shortTagline) && (
                    // 🔴 왜 사라졌는지 말해준다. 아무 설명 없이 비면 "내 입력이 안 저장됐나"로 읽힌다.
                    <p className="text-xs text-amber-700">
                      지점명이 길어 목록 카드에서는 짧은 소개가 표시되지 않습니다. 지점 상세에는 그대로
                      나옵니다.
                    </p>
                  )}
              </div>
              <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-white p-4">
                <BranchDetailView data={previewData} variant="preview" />
              </div>
            </div>
          )}
        </>
      )}
    </form>
  );
}
