'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImagePlus, Star, VideoIcon, X } from 'lucide-react';
import {
  uploadPartnerBranchPhotoAction,
  uploadPartnerBranchVideoAction,
  completeBranchRegistrationAction,
} from '@/lib/actions/partner';
import { deleteBranchMediaAction } from '@/lib/actions/branch-media-admin';
import type { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type BranchMediaRow = Database['public']['Tables']['branch_media']['Row'];

const MIN_OFFICE_PHOTOS = 3;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export function ContinueRegistrationForm({
  registrationId,
  branchId,
  media,
  imageBaseUrl,
}: {
  registrationId: string;
  branchId: string;
  media: BranchMediaRow[];
  imageBaseUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const mainPhoto = media.find((m) => m.media_type === 'image_main') ?? null;
  const officePhotos = media.filter((m) => m.media_type === 'image_office');
  const video = media.find((m) => m.media_type === 'video') ?? null;
  const canComplete = Boolean(mainPhoto) && officePhotos.length >= MIN_OFFICE_PHOTOS;

  async function handleMainPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file || !IMAGE_TYPES.includes(file.type)) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    const result = await uploadPartnerBranchPhotoAction(branchId, fd, true, 0);
    setIsUploading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleOfficePhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    let sortOrder = officePhotos.length;
    // 🔴 예전에는 이 루프가 결과를 통째로 버렸고(`await ...(...)` 만 하고 끝),
    // 형식이 안 맞는 파일은 조용히 `continue` 했다. 10장을 고르고 한 장이 실패해도
    // 화면에는 아무 말도 안 나와서 **지점장은 10장이 올라간 줄 안다.**
    // 실패한 장수와 이유를 반드시 눈에 보이게 남긴다.
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      if (!IMAGE_TYPES.includes(file.type)) {
        // 아이폰 기본 포맷(HEIC)이 여기로 떨어진다 - 가장 흔한 조용한 탈락 지점이다.
        failures.push(`${file.name}: jpg, png, webp 형식만 올릴 수 있습니다`);
        continue;
      }
      const fd = new FormData();
      fd.set('file', file);
      // eslint-disable-next-line no-await-in-loop
      const result = await uploadPartnerBranchPhotoAction(branchId, fd, false, sortOrder);
      if (!result.success) {
        failures.push(`${file.name}: ${result.error ?? '업로드하지 못했습니다'}`);
        continue;
      }
      sortOrder += 1;
    }
    setIsUploading(false);
    if (failures.length > 0) {
      toast.error(`${failures.length}장이 등록되지 않았습니다.`, { description: failures.join('\n') });
    }
    router.refresh();
  }

  async function handleVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file || !VIDEO_TYPES.includes(file.type)) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    const result = await uploadPartnerBranchVideoAction(branchId, fd);
    setIsUploading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(mediaId: string, bucket: 'branch-images' | 'branch-videos') {
    const result = await deleteBranchMediaAction(mediaId, branchId, bucket);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeBranchRegistrationAction(registrationId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(`/partner/register/complete?branchId=${branchId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">대표사진 (필수, 1장)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">목록/지도/검색결과에 썸네일로 노출되는 사진입니다.</p>
          {mainPhoto ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${imageBaseUrl}/${mainPhoto.value}`} alt="대표사진" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Star className="h-2.5 w-2.5 fill-white" />
                대표사진
              </span>
              <button
                type="button"
                onClick={() => handleDelete(mainPhoto.id, 'branch-images')}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="대표사진 삭제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
              <ImagePlus className="h-6 w-6" />
              {isUploading ? '업로드 중...' : '대표사진을 눌러서 선택하세요'}
              <input
                type="file"
                accept={IMAGE_TYPES.join(',')}
                className="hidden"
                disabled={isUploading}
                onChange={(e) => handleMainPhoto(e.target.files)}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">사무실 사진 (필수, 최소 {MIN_OFFICE_PHOTOS}장)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">대표사진과 별도로, 지점 상세페이지에서만 노출되는 사무실 사진입니다. (권장 5~10장)</p>
          {!mainPhoto && (
            // 🔴 add_branch_media RPC는 지점에 이미지가 하나도 없으면 **첫 장을 대표사진으로**
            // 바꾼다(partner.ts의 "첫 업로드 = 대표사진 정책"). 이 규칙이 화면에 안 적혀 있어서
            // 「사무실 10장을 올렸는데 9장만 있다」로 보이는 일이 실제로 있었다(일품지점).
            // 사진이 사라진 게 아니라 한 장이 대표사진이 된 것이다 - 그 사실을 미리 말해 준다.
            <p className="text-xs font-medium text-brand-600">
              대표사진이 아직 없어서, 여기서 올리는 첫 장이 대표사진으로 등록됩니다.
            </p>
          )}

          {officePhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {officePhotos.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${imageBaseUrl}/${item.value}`} alt="사무실 사진" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, 'branch-images')}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="삭제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600',
              isUploading && 'pointer-events-none opacity-50'
            )}
          >
            <ImagePlus className="h-6 w-6" />
            {isUploading ? '업로드 중...' : `사진을 눌러서 선택하세요 (${officePhotos.length}/${MIN_OFFICE_PHOTOS}장 이상 필요)`}
            <input
              type="file"
              accept={IMAGE_TYPES.join(',')}
              multiple
              className="hidden"
              disabled={isUploading}
              onChange={(e) => handleOfficePhotos(e.target.files)}
            />
          </label>
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
          {video ? (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branch-videos/${video.value}`}
                controls
                className="aspect-video w-full"
              />
              <button
                type="button"
                onClick={() => handleDelete(video.id, 'branch-videos')}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="영상 삭제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600">
              <VideoIcon className="h-6 w-6" />
              {isUploading ? '업로드 중...' : '영상을 선택하세요'}
              <input
                type="file"
                accept={VIDEO_TYPES.join(',')}
                className="hidden"
                disabled={isUploading}
                onChange={(e) => handleVideo(e.target.files)}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <Button type="button" size="lg" disabled={!canComplete || isPending || isUploading} onClick={handleComplete}>
        {isPending ? '제출 중...' : '완료하고 승인 요청'}
      </Button>
      {!canComplete && <p className="text-center text-xs text-muted-foreground">대표사진 1장과 사무실사진 {MIN_OFFICE_PHOTOS}장 이상을 등록해주세요.</p>}
    </div>
  );
}
