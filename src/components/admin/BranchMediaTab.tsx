'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UploadCloud, Trash2, Video, Link as LinkIcon } from 'lucide-react';
import {
  addBranchVideoUrlAction,
  deleteBranchMediaAction,
  uploadBranchImageAction,
  uploadBranchVideoAction,
} from '@/lib/actions/branch-media-admin';
import type { BranchMediaRow } from '@/lib/admin/branch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';

function Dropzone({
  label,
  hint,
  accept,
  disabled,
  isUploading,
  onFiles,
}: {
  label: string;
  hint: string;
  accept: string;
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
        accept={accept}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}

export function BranchMediaTab({
  branchId,
  gaCompanyId,
  media,
  imageBaseUrl,
}: {
  branchId: string;
  gaCompanyId: string;
  media: BranchMediaRow[];
  imageBaseUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploadingSlot, setUploadingSlot] = useState<'main' | 'office' | 'video' | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  const mainImages = media.filter((m) => m.media_type === 'image_main');
  const officeImages = media.filter((m) => m.media_type === 'image_office');
  const videos = media.filter((m) => m.media_type === 'video');

  function handleImageDrop(slot: 'main' | 'office', files: FileList) {
    setUploadingSlot(slot);
    const uploads = Array.from(files).map((file) => {
      const formData = new FormData();
      formData.set('file', file);
      return uploadBranchImageAction(branchId, gaCompanyId, slot === 'main' ? 'image_main' : 'image_office', formData);
    });

    Promise.all(uploads)
      .then((results) => {
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          toast.error((failed[0] as { success: false; error: string }).error);
        } else {
          toast.success('업로드했습니다.');
        }
      })
      .finally(() => setUploadingSlot(null));
  }

  function handleVideoDrop(files: FileList) {
    const file = files[0];
    if (!file) return;
    setUploadingSlot('video');
    const formData = new FormData();
    formData.set('file', file);
    uploadBranchVideoAction(branchId, gaCompanyId, formData)
      .then((result) => {
        if (result.success) toast.success('영상을 업로드했습니다.');
        else toast.error(result.error);
      })
      .finally(() => setUploadingSlot(null));
  }

  function handleAddVideoUrl(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addBranchVideoUrlAction(branchId, videoUrl);
      if (result.success) {
        toast.success('영상 링크를 추가했습니다.');
        setVideoUrl('');
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(mediaRow: BranchMediaRow) {
    const bucket = mediaRow.source !== 'storage' ? null : mediaRow.media_type === 'video' ? 'branch-videos' : 'branch-images';
    startTransition(async () => {
      const result = await deleteBranchMediaAction(mediaRow.id, branchId, bucket);
      if (result.success) toast.success('삭제했습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">대표사진</CardTitle>
          <CardDescription>지점 목록/상세 최상단에 노출되는 사진 1장</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {mainImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {mainImages.map((item) => (
                <MediaThumb key={item.id} src={`${imageBaseUrl}/${item.value}`} onDelete={() => handleDelete(item)} disabled={isPending} />
              ))}
            </div>
          ) : (
            <Dropzone
              label="대표사진 업로드"
              hint="드래그 앤 드롭 또는 클릭 (jpg/png/webp, 5MB 이하)"
              accept={IMAGE_ACCEPT}
              isUploading={uploadingSlot === 'main'}
              onFiles={(files) => handleImageDrop('main', files)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">사무실사진</CardTitle>
          <CardDescription>여러 장 등록할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {officeImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {officeImages.map((item) => (
                <MediaThumb key={item.id} src={`${imageBaseUrl}/${item.value}`} onDelete={() => handleDelete(item)} disabled={isPending} />
              ))}
            </div>
          )}
          <Dropzone
            label="사무실사진 업로드"
            hint="드래그 앤 드롭 또는 클릭 (jpg/png/webp, 5MB 이하, 여러 장 가능)"
            accept={IMAGE_ACCEPT}
            isUploading={uploadingSlot === 'office'}
            onFiles={(files) => handleImageDrop('office', files)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">홍보영상</CardTitle>
          <CardDescription>파일 업로드 또는 유튜브 등 외부 링크</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {videos.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-md border p-2.5">
              <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
              {item.source === 'external' ? (
                <a href={item.value} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary hover:underline">
                  {item.value}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm">{item.value.split('/').pop()}</span>
              )}
              <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleDelete(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Dropzone
            label="영상 파일 업로드"
            hint="드래그 앤 드롭 또는 클릭 (mp4/webm/mov, 200MB 이하)"
            accept={VIDEO_ACCEPT}
            isUploading={uploadingSlot === 'video'}
            onFiles={handleVideoDrop}
          />

          <form onSubmit={handleAddVideoUrl} className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <Button type="submit" variant="outline" disabled={isPending}>
              링크 추가
            </Button>
          </form>
        </CardContent>
      </Card>
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
