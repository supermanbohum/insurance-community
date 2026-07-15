'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_MAX_COUNT,
  validateImageFile,
} from '@/lib/validation/post';

export interface ExistingImage {
  id: string;
  url: string;
}

interface ImageUploaderProps {
  /** 새로 첨부하는 파일들이 담길 폼 필드명 (작성: images, 수정: newImages) */
  name: string;
  existingImages?: ExistingImage[];
}

export function ImageUploader({ name, existingImages = [] }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletedExistingIds, setDeletedExistingIds] = useState<string[]>([]);

  const remainingExistingCount = existingImages.length - deletedExistingIds.length;

  function applyFiles(nextFiles: File[]) {
    if (!inputRef.current) return;
    const dataTransfer = new DataTransfer();
    nextFiles.forEach((file) => dataTransfer.items.add(file));
    inputRef.current.files = dataTransfer.files;

    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    const remainingSlots = IMAGE_MAX_COUNT - remainingExistingCount - files.length;

    if (remainingSlots <= 0) {
      setError(`이미지는 최대 ${IMAGE_MAX_COUNT}장까지 첨부할 수 있습니다.`);
      applyFiles(files);
      return;
    }

    const accepted: File[] = [];
    let firstError: string | null = null;
    for (const file of incoming) {
      if (accepted.length >= remainingSlots) break;
      const invalidReason = validateImageFile(file);
      if (invalidReason) {
        firstError = firstError ?? invalidReason;
        continue;
      }
      accepted.push(file);
    }

    setError(firstError);
    applyFiles([...files, ...accepted]);
  }

  function handleRemoveNew(index: number) {
    applyFiles(files.filter((_, i) => i !== index));
  }

  function toggleDeleteExisting(id: string) {
    setDeletedExistingIds((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id]
    );
  }

  return (
    <div>
      {existingImages.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {existingImages.map((image) => {
            const markedForDelete = deletedExistingIds.includes(image.id);
            return (
              <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="120px"
                  className={markedForDelete ? 'object-cover opacity-30' : 'object-cover'}
                />
                <button
                  type="button"
                  onClick={() => toggleDeleteExisting(image.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
                >
                  {markedForDelete ? '취소' : '삭제'}
                </button>
                {markedForDelete && (
                  <input type="hidden" name="deleteImageIds" value={image.id} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {previews.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((url, index) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
              <Image src={url} alt="" fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveNew(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-brand-400 hover:text-brand-600">
        <span>이미지 추가 (최대 {IMAGE_MAX_COUNT}장)</span>
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
