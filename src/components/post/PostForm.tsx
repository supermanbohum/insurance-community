'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateAnonName } from '@/lib/anon-name';
import { ImageUploader, type ExistingImage } from '@/components/post/ImageUploader';
import {
  POST_TITLE_MAX_LENGTH,
  POST_CONTENT_MAX_LENGTH,
} from '@/lib/validation/post';
import { DEFAULT_OPERATION_SETTINGS } from '@/lib/config/site';
import type { PostActionResult } from '@/lib/actions/posts';

export interface PostFormCategory {
  id: string;
  name: string;
}

interface PostFormProps {
  mode: 'create' | 'edit';
  categories?: PostFormCategory[];
  initialValues?: {
    categoryName: string;
    authorDisplayName: string;
    title: string;
    content: string;
  };
  existingImages?: ExistingImage[];
  action: (formData: FormData) => Promise<PostActionResult>;
}

export function PostForm({ mode, categories = [], initialValues, existingImages = [], action }: PostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [authorNameType, setAuthorNameType] = useState<'random' | 'custom'>('random');
  const [randomName, setRandomName] = useState(() => generateAnonName());

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    if (mode === 'create') {
      formData.set('authorNameType', authorNameType);
      if (authorNameType === 'random') {
        formData.set('authorDisplayName', randomName);
      }
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        router.push(`/post/${result.postId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 py-6">
      {mode === 'create' ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">카테고리</label>
          <select
            name="categoryId"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-gray-500">카테고리: {initialValues?.categoryName}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">제목</label>
        <input
          name="title"
          type="text"
          required
          maxLength={POST_TITLE_MAX_LENGTH}
          defaultValue={initialValues?.title}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">본문</label>
        <textarea
          name="content"
          required
          rows={10}
          maxLength={POST_CONTENT_MAX_LENGTH}
          defaultValue={initialValues?.content}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {mode === 'create' ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">작성자명</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAuthorNameType('random')}
              className={
                authorNameType === 'random'
                  ? 'rounded-full bg-brand-600 px-3 py-1 text-xs text-white'
                  : 'rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600'
              }
            >
              자동 생성
            </button>
            <button
              type="button"
              onClick={() => setAuthorNameType('custom')}
              className={
                authorNameType === 'custom'
                  ? 'rounded-full bg-brand-600 px-3 py-1 text-xs text-white'
                  : 'rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600'
              }
            >
              직접 입력
            </button>
          </div>

          {authorNameType === 'random' ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {randomName}
              </span>
              <button
                type="button"
                onClick={() => setRandomName(generateAnonName())}
                className="text-xs text-brand-600 underline"
              >
                다시 생성
              </button>
            </div>
          ) : (
            <input
              name="authorDisplayName"
              type="text"
              maxLength={DEFAULT_OPERATION_SETTINGS.authorNameMaxLength}
              placeholder="작성자명을 입력해주세요"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">작성자: {initialValues?.authorDisplayName}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">이미지</label>
        <ImageUploader name={mode === 'create' ? 'images' : 'newImages'} existingImages={existingImages} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? '처리 중...' : mode === 'create' ? '작성 완료' : '수정 완료'}
      </button>
    </form>
  );
}
