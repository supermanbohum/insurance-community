'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Star, VideoIcon, X } from 'lucide-react';
import {
  registerGaAction,
  savePartnerBranchLinksAction,
  uploadPartnerBranchPhotoAction,
  uploadPartnerBranchVideoAction,
} from '@/lib/actions/partner';
import type { RegionRow } from '@/lib/admin/branch';
import type { GaFilterOption } from '@/lib/public/ga-directory';
import { RegionSelect } from '@/components/admin/RegionSelect';
import { GaSelect } from '@/components/partner/GaSelect';
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
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

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

  const [gaName, setGaName] = useState('');
  const [branchName, setBranchName] = useState('');
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
  const [photos, setPhotos] = useState<File[]>([]);
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
  const canSubmit =
    gaName && branchName.trim() && addressValue.address && tagline.trim() && introText.trim().length >= MIN_INTRO_LENGTH && photos.length >= MIN_PHOTOS;

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((f) => IMAGE_TYPES.includes(f.type));
    if (accepted.length < files.length) {
      toast.error('jpg, png, webp 형식만 업로드할 수 있습니다.');
    }
    setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((prev) => {
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
    if (!canSubmit) return;

    startTransition(async () => {
      const result = await registerGaAction({
        gaName,
        branch: {
          name: branchName,
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

      const totalSteps = photos.length + (video ? 1 : 0);
      setUploadProgress({ done: 0, total: totalSteps });
      for (let i = 0; i < photos.length; i++) {
        const fd = new FormData();
        fd.set('file', photos[i]);
        // eslint-disable-next-line no-await-in-loop
        await uploadPartnerBranchPhotoAction(result.branchId, fd, i === 0, i);
        setUploadProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
      }
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

      toast.success('등록 신청이 접수되었습니다. 관리자 승인 후 지도에 노출됩니다.');
      triggerHaptic('success');
      router.push('/partner');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 소속 GA 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <GaSelect options={gaOptions} value={gaName} onChange={setGaName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 지점명</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onb-branch-name">지점명</Label>
            <Input id="onb-branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">③ 주소 검색</CardTitle>
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
          <CardTitle className="text-base">사무실 사진 (필수, 최소 {MIN_PHOTOS}장)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            ※ 실제 사무실 사진을 최소 {MIN_PHOTOS}장 이상 등록해주세요. 사진이 많을수록 노출 및 신뢰도가 높아집니다. (권장 5~10장)
          </p>

          <label
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600',
              photos.length >= MAX_PHOTOS && 'pointer-events-none opacity-50'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addPhotos(e.dataTransfer.files);
            }}
          >
            <ImagePlus className="h-6 w-6" />
            사진을 드래그하거나 눌러서 선택하세요 ({photos.length}/{MAX_PHOTOS})
            <input
              type="file"
              accept={IMAGE_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => addPhotos(e.target.files)}
            />
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt={`사무실 사진 ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <Star className="h-2.5 w-2.5 fill-white" />
                      대표
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} className="p-1 text-white disabled:opacity-30" aria-label="앞으로 이동">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} className="p-1 text-white disabled:opacity-30" aria-label="뒤로 이동">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => removePhoto(i)} className="p-1 text-white" aria-label="삭제">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className={cn('text-xs', photos.length >= MIN_PHOTOS ? 'text-brand-600' : 'text-destructive')}>
            {photos.length}/{MIN_PHOTOS}장 이상 필요
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
          <CardTitle className="text-base">④ 상세 정보</CardTitle>
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
            ? `미디어 업로드 중... (${uploadProgress.done}/${uploadProgress.total})`
            : '제출 중...'
          : '⑤ 등록 신청'}
      </Button>
      {!canSubmit && !isPending && (
        <p className="text-center text-xs text-muted-foreground">GA/지점명/주소/한줄소개/사진 3장 이상/소개글 50자 이상을 모두 입력해주세요.</p>
      )}
    </form>
  );
}
