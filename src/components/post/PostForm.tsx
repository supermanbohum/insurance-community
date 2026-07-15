'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    if (mode === 'create') {
      formData.set('authorNameType', authorNameType);
      // random 모드에서는 authorDisplayName을 비워서 제출한다.
      // 실제 "익명____" 이름 생성은 서버(createPostAction)가 제출 시점에 한 번만 수행한다
      // (렌더링 중에 미리 생성해서 보여주면 서버/클라이언트 값이 달라져 hydration 오류가 난다).
      if (authorNameType === 'random') {
        formData.set('authorDisplayName', '');
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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white px-4 py-5 lg:rounded-md lg:border lg:border-gray-200">
      {mode === 'create' ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">카테고리</label>
          <select
            name="categoryId"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
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
            <p className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              작성자명을 입력하지 않으면 &ldquo;익명0000&rdquo; 형태로 자동 생성됩니다.
            </p>
          ) : (
            <input
              name="authorDisplayName"
              type="text"
              maxLength={DEFAULT_OPERATION_SETTINGS.authorNameMaxLength}
              placeholder="작성자명을 입력해주세요"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">작성자: {initialValues?.authorDisplayName}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">제목</label>
        <input
          name="title"
          type="text"
          required
          maxLength={POST_TITLE_MAX_LENGTH}
          defaultValue={initialValues?.title}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">이미지</label>
        <ImageUploader name={mode === 'create' ? 'images' : 'newImages'} existingImages={existingImages} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? '처리 중...' : mode === 'create' ? '등록' : '수정 완료'}
      </button>
    </form>
  );
}
