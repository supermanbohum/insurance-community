'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { BadgeCheck } from 'lucide-react';
import { CommentForm } from '@/components/post/CommentForm';
import type { CommentThread, CommentRow } from '@/lib/posts/comments';

interface CommentSectionProps {
  postId: string;
  comments: CommentThread[];
  isFullMember: boolean;
  loginHref: string;
}

function CommentRowView({ comment }: { comment: CommentRow }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        {comment.author_name_type === 'admin' ? (
          <span className="flex items-center gap-0.5 font-bold text-brand-600">
            <BadgeCheck className="h-3 w-3" /> {comment.author_display_name}
          </span>
        ) : (
          <span className="font-medium text-ink-soft">{comment.author_display_name}</span>
        )}
        <span>{format(new Date(comment.created_at), 'yyyy.MM.dd HH:mm')}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">{comment.content}</p>
    </div>
  );
}

export function CommentSection({ postId, comments, isFullMember, loginHref }: CommentSectionProps) {
  const router = useRouter();
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);

  const totalCount = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);

  function refresh() {
    setReplyTargetId(null);
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <h2 className="mb-3 text-sm font-bold text-ink">댓글 {totalCount}개</h2>

      {isFullMember ? (
        <CommentForm postId={postId} onSuccess={refresh} />
      ) : (
        <div className="rounded-xl bg-surface-sunken px-3.5 py-3 text-xs leading-relaxed text-ink-faint">
          이메일 인증(또는 카카오 연동 인증)을 완료한 정회원만 댓글을 작성할 수 있습니다.{' '}
          <Link href={loginHref} className="font-semibold text-brand-600 hover:underline">
            로그인 / 인증하러 가기
          </Link>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="mt-6 text-center text-sm text-ink-faint">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-3">
              <CommentRowView comment={comment} />

              {isFullMember && (
                <button
                  type="button"
                  onClick={() => setReplyTargetId(replyTargetId === comment.id ? null : comment.id)}
                  className="self-start text-xs font-medium text-ink-faint hover:text-brand-600"
                >
                  답글
                </button>
              )}

              {replyTargetId === comment.id && (
                <div className="ml-4 border-l-2 border-line pl-3">
                  <CommentForm
                    postId={postId}
                    parentCommentId={comment.id}
                    autoFocus
                    onSuccess={refresh}
                    onCancel={() => setReplyTargetId(null)}
                  />
                </div>
              )}

              {comment.replies.length > 0 && (
                <div className="ml-4 flex flex-col gap-3 border-l-2 border-line pl-3">
                  {comment.replies.map((reply) => (
                    <CommentRowView key={reply.id} comment={reply} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
