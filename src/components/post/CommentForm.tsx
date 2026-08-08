'use client';

import { useState, useTransition } from 'react';
import { createCommentAction } from '@/lib/actions/comments';
import { COMMENT_CONTENT_MAX_LENGTH } from '@/lib/validation/comment';

interface CommentFormProps {
  postId: string;
  parentCommentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CommentForm({ postId, parentCommentId, placeholder, autoFocus, onSuccess, onCancel }: CommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [authorNameType, setAuthorNameType] = useState<'random' | 'custom'>('random');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('postId', postId);
    if (parentCommentId) formData.set('parentCommentId', parentCommentId);
    formData.set('authorNameType', authorNameType);
    if (authorNameType === 'random') {
      formData.set('authorDisplayName', '');
    }

    startTransition(async () => {
      const result = await createCommentAction(formData);
      if (result.success) {
        (event.target as HTMLFormElement).reset();
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAuthorNameType('random')}
          className={
            authorNameType === 'random'
              ? 'rounded-full bg-brand-600 px-2.5 py-1 text-xs text-white'
              : 'rounded-full border border-line px-2.5 py-1 text-xs text-ink-faint'
          }
        >
          자동 생성
        </button>
        <button
          type="button"
          onClick={() => setAuthorNameType('custom')}
          className={
            authorNameType === 'custom'
              ? 'rounded-full bg-brand-600 px-2.5 py-1 text-xs text-white'
              : 'rounded-full border border-line px-2.5 py-1 text-xs text-ink-faint'
          }
        >
          직접 입력
        </button>
        {authorNameType === 'custom' && (
          <input
            name="authorDisplayName"
            type="text"
            maxLength={12}
            placeholder="작성자명"
            className="w-28 rounded-md border border-line px-2 py-1 text-xs outline-none focus:border-brand-500"
          />
        )}
      </div>

      <textarea
        name="content"
        required
        autoFocus={autoFocus}
        rows={parentCommentId ? 2 : 3}
        maxLength={COMMENT_CONTENT_MAX_LENGTH}
        placeholder={placeholder ?? '익명이고, 소속을 밝히실 필요도 없습니다. 자유롭게 댓글을 남겨주세요.'}
        className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand-500"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-faint">
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? '등록 중...' : parentCommentId ? '답글 등록' : '댓글 등록'}
        </button>
      </div>
    </form>
  );
}
