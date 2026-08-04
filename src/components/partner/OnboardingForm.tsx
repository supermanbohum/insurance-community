'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, FileText, ImagePlus, ScanFace, Star, VideoIcon, X } from 'lucide-react';
import {
  submitBranchRegistrationAction,
  uploadRegistrationDocumentAction,
  savePartnerBranchLinksAction,
  uploadPartnerBranchPhotoAction,
  uploadPartnerBranchVideoAction,
} from '@/lib/actions/partner';
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
const MIN_OFFICE_PHOTOS = 3;
const MAX_OFFICE_PHOTOS = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

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

export function OnboardingForm({ regions, gaOptions }: { regions: RegionRow[]; gaOptions: GaFilterOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [registrant, setRegistrant] = useState<Record<(typeof REGISTRANT_FIELDS)[number]['key'], string>>({
    name: '',
    title: '',
    phone: '',
    branchLabel: '',
  });
  const [leaseContract, setLeaseContract] = useState<File | null>(null);
  const [businessCard, setBusinessCard] = useState<File | null>(null);
  const [gaCompanyId, setGaCompanyId] = useState<string | null>(null);
  const gaName = gaOptions.find((g) => g.id === gaCompanyId)?.name ?? '';
  const [regionId, setRegionId] = useState<string | null>(null);
  const [addressValue, setAddressValue] = useState<AddressValue>({ address: '', addressDetail: '', zonecode: '', lat: null, lng: null });
  const [tagline, setTagline] = useState('');
  const [introText, setIntroText] = useState('');
  const [plannerCount, setPlannerCount] = useState<number | ''>('');
  const [amenities, setAmenities] = useState<Record<AmenityOption['key'], boolean>>({
    parkingAvailable: false,
    visitConsultAvailable: false,
    newRecruitTraining: false,
    experiencedHire: false,
    dbSupport: false,
    settlementSupport: false,
  });
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [officePhotos, setOfficePhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [links, setLinks] = useState<Record<(typeof LINK_FIELDS)[number]['key'], string>>({
    instagram: '',
    blog: '',
    youtube: '',
    website: '',
    etc: '',
  });
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const introRemaining = MIN_INTRO_LENGTH - introText.trim().length;
  const registrantComplete = REGISTRANT_FIELDS.every((f) => registrant[f.key].trim());
  const canSubmit =
    gaName &&
    addressValue.address &&
    tagline.trim() &&
    introText.trim().length >= MIN_INTRO_LENGTH &&
    registrantComplete &&
    leaseContract &&
    businessCard &&
    mainPhoto &&
    officePhotos.length >= MIN_OFFICE_PHOTOS;

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
    setOfficePhotos((prev) => [...prev, ...accepted].slice(0, MAX_OFFICE_PHOTOS));
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !mainPhoto || !leaseContract || !businessCard) return;

    startTransition(async () => {
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

      const totalSteps = 1 + officePhotos.length + 2 + (video ? 1 : 0);
      setUploadProgress({ done: 0, total: totalSteps });

      const mainFd = new FormData();
      mainFd.set('file', mainPhoto);
      await uploadPartnerBranchPhotoAction(result.branchId, mainFd, true, 0);
      setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));

      for (let i = 0; i < officePhotos.length; i++) {
        const fd = new FormData();
        fd.set('file', officePhotos[i]);
        // eslint-disable-next-line no-await-in-loop
        await uploadPartnerBranchPhotoAction(result.branchId, fd, false, i);
        setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
      }

      const leaseFd = new FormData();
      leaseFd.set('file', leaseContract);
      await uploadRegistrationDocumentAction(result.registrationId, 'lease_contract', leaseFd);
      setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));

      const cardFd = new FormData();
      cardFd.set('file', businessCard);
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
      router.push(`/partner/register/complete?branchId=${result.branchId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 등록자 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            실제 지점 확인 및 허위·중복 등록 방지를 위해 등록자 정보를 입력해주세요. 관리자 승인 참고자료로만 사용됩니다.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-ga-select">소속 GA</Label>
            <GaSearchSelect options={gaOptions} value={gaCompanyId} onChange={setGaCompanyId} placeholder="소속 GA를 검색하세요" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REGISTRANT_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`onb-registrant-${field.key}`}>{field.label}</Label>
                <Input
                  id={`onb-registrant-${field.key}`}
                  value={registrant[field.key]}
                  onChange={(e) => setRegistrant((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 주소 검색</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegionSelect regions={regions} value={regionId} onChange={setRegionId} />
          <AddressSearchField value={addressValue} onChange={setAddressValue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">필수 서류</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            임대차계약서와 등록자 명함을 첨부해주세요. 실제 지점 확인 및 관리자 승인에만 사용되며 외부에 노출되지 않습니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>임대차계약서</Label>
              {leaseContract ? (
                <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-1.5 truncate text-ink-soft">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{leaseContract.name}</span>
                  </span>
                  <button type="button" onClick={() => setLeaseContract(null)} aria-label="임대차계약서 삭제">
                    <X className="h-4 w-4 text-ink-faint" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
                  <FileText className="h-4 w-4" />
                  파일 선택 (jpg/png/pdf)
                  <input type="file" accept={DOC_TYPES.join(',')} className="hidden" onChange={(e) => pickDoc(e.target.files, setLeaseContract)} />
                </label>
              )}
            </div>
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
          <CardTitle className="text-base">사무실 사진 (필수, 최소 {MIN_OFFICE_PHOTOS}장)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            대표사진과 별도로, 지점 상세페이지에서만 노출되는 사무실 사진을 최소 {MIN_OFFICE_PHOTOS}장 이상 등록해주세요. (권장 5~10장)
          </p>

          <label
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600',
              officePhotos.length >= MAX_OFFICE_PHOTOS && 'pointer-events-none opacity-50'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addOfficePhotos(e.dataTransfer.files);
            }}
          >
            <ImagePlus className="h-6 w-6" />
            사진을 드래그하거나 눌러서 선택하세요 ({officePhotos.length}/{MAX_OFFICE_PHOTOS})
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">③ 상세 정보</CardTitle>
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

      <Button type="submit" disabled={isPending || !canSubmit} size="lg">
        {isPending
          ? uploadProgress && uploadProgress.total > 0
            ? `업로드 중... (${uploadProgress.done}/${uploadProgress.total})`
            : '제출 중...'
          : '④ 등록 신청'}
      </Button>
      {!canSubmit && !isPending && (
        <p className="text-center text-xs text-muted-foreground">
          등록자 정보(소속 GA 포함)/주소/한줄소개/필수 서류 2종/대표사진 1장/사무실사진 {MIN_OFFICE_PHOTOS}장 이상/소개글 {MIN_INTRO_LENGTH}자 이상을 모두
          입력해주세요.
        </p>
      )}
    </form>
  );
}
