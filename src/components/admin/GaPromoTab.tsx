'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UploadCloud, Trash2 } from 'lucide-react';
import { updateGaCompanyAction } from '@/lib/actions/ga-admin';
import { deleteGaMediaAction, uploadGaBannerAction, uploadGaGalleryImageAction } from '@/lib/actions/ga-media-admin';
import type { GaCompanyRow, GaMediaRow } from '@/lib/admin/ga';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** mock 시드 이미지(`/mock-logos/...`)처럼 이미 절대경로/외부 URL인 값은 그대로 쓰고,
 * 실제 업로드된 storage 키만 imageBaseUrl과 합친다. */
function resolveMediaUrl(value: string, source: 'storage' | 'external', imageBaseUrl: string): string {
  if (source === 'external' || value.startsWith('/') || /^https?:\/\//.test(value)) return value;
  return `${imageBaseUrl}/${value}`;
}

export interface GaPromoDraft {
  description: string;
  educationInfo: string;
  welfareInfo: string;
  strengthsInfo: string;
  promoVideoUrl: string;
}

function Dropzone({
  label,
  hint,
  disabled,
  isUploading,
  onFiles,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  isUploading: boolean;
  onFiles: (files: FileList) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled || !e.dataTransfer.files.length) return;
        onFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <UploadCloud className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium">{isUploading ? '업로드 중...' : label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}

function MediaThumb({ src, onDelete, disabled }: { src: string; onDelete: () => void; disabled?: boolean }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function GaPromoTab({
  ga,
  media,
  imageBaseUrl,
  onDraftChange,
}: {
  ga: GaCompanyRow;
  media: GaMediaRow[];
  imageBaseUrl: string;
  onDraftChange?: (draft: GaPromoDraft) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploadingSlot, setUploadingSlot] = useState<'banner' | 'gallery' | null>(null);
  const [description, setDescription] = useState(ga.description ?? '');
  const [educationInfo, setEducationInfo] = useState(ga.education_info ?? '');
  const [welfareInfo, setWelfareInfo] = useState(ga.welfare_info ?? '');
  const [strengthsInfo, setStrengthsInfo] = useState(ga.strengths_info ?? '');
  const [promoVideoUrl, setPromoVideoUrl] = useState(ga.promo_video_url ?? '');

  const banner = media.find((m) => m.media_type === 'banner');
  const gallery = media.filter((m) => m.media_type === 'gallery');

  useEffect(() => {
    onDraftChange?.({ description, educationInfo, welfareInfo, strengthsInfo, promoVideoUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, educationInfo, welfareInfo, strengthsInfo, promoVideoUrl]);

  function handleUpload(slot: 'banner' | 'gallery', files: FileList) {
    setUploadingSlot(slot);
    const uploads = Array.from(files).map((file) => {
      const formData = new FormData();
      formData.set('file', file);
      return slot === 'banner' ? uploadGaBannerAction(ga.id, formData) : uploadGaGalleryImageAction(ga.id, formData);
    });

    Promise.all(uploads)
      .then((results) => {
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) toast.error((failed[0] as { success: false; error: string }).error);
        else toast.success('업로드했습니다.');
      })
      .finally(() => setUploadingSlot(null));
  }

  function handleDelete(mediaRow: GaMediaRow) {
    const bucket = mediaRow.source !== 'storage' ? null : mediaRow.media_type === 'banner' ? 'company-banners' : 'company-gallery';
    startTransition(async () => {
      const result = await deleteGaMediaAction(mediaRow.id, ga.id, bucket);
      if (result.success) toast.success('삭제했습니다.');
      else toast.error(result.error);
    });
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGaCompanyAction(ga.id, { description, educationInfo, welfareInfo, strengthsInfo, promoVideoUrl });
      if (result.success) toast.success('저장되었습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">대표 배너</CardTitle>
          <CardDescription>GA 상세페이지 최상단에 노출되는 배너 1장</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {banner ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <MediaThumb
                src={resolveMediaUrl(banner.value, banner.source, imageBaseUrl)}
                onDelete={() => handleDelete(banner)}
                disabled={isPending}
              />
            </div>
          ) : (
            <Dropzone
              label="배너 업로드"
              hint="드래그 앤 드롭 또는 클릭 (jpg/png/webp, 5MB 이하)"
              isUploading={uploadingSlot === 'banner'}
              onFiles={(files) => handleUpload('banner', files)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">갤러리 이미지</CardTitle>
          <CardDescription>여러 장 등록할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {gallery.map((item) => (
                <MediaThumb
                  key={item.id}
                  src={resolveMediaUrl(item.value, item.source, imageBaseUrl)}
                  onDelete={() => handleDelete(item)}
                  disabled={isPending}
                />
              ))}
            </div>
          )}
          <Dropzone
            label="갤러리 이미지 업로드"
            hint="드래그 앤 드롭 또는 클릭 (jpg/png/webp, 5MB 이하, 여러 장 가능)"
            isUploading={uploadingSlot === 'gallery'}
            onFiles={(files) => handleUpload('gallery', files)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleTextSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-desc">회사 소개</Label>
              <Textarea id="ga-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-edu">교육 소개</Label>
              <Textarea id="ga-edu" value={educationInfo} onChange={(e) => setEducationInfo(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-welfare">복지 소개</Label>
              <Textarea id="ga-welfare" value={welfareInfo} onChange={(e) => setWelfareInfo(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-strengths">회사 강점</Label>
              <Textarea id="ga-strengths" value={strengthsInfo} onChange={(e) => setStrengthsInfo(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ga-promo-video">홍보영상(유튜브 링크)</Label>
              <Input
                id="ga-promo-video"
                value={promoVideoUrl}
                onChange={(e) => setPromoVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <Button type="submit" disabled={isPending} className="self-start">
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
