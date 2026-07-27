import Link from 'next/link';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ImageIcon, MessageCircle, Pin, Sparkles, Megaphone } from 'lucide-react';
import type { PublicPostSummary } from '@/types/database';

export function PostCard({ post }: { post: PublicPostSummary }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className={clsx(
        'flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover',
        post.isNotice && 'border-brand-200 bg-brand-50/40'
      )}
    >
      <div className="flex items-center gap-1.5">
        {post.isNotice && (
          <span className="flex items-center gap-0.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <Megaphone className="h-2.5 w-2.5" /> 공지
          </span>
        )}
        {post.isPinned && (
          <span className="flex items-center gap-0.5 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-bold text-ink-soft">
            <Pin className="h-2.5 w-2.5" /> 고정
          </span>
        )}
        {post.isBest && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">🔥 인기</span>
        )}
        {post.isEditorPick && (
          <span className="flex items-center gap-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
            <Sparkles className="h-2.5 w-2.5" /> 에디터픽
          </span>
        )}
        <span className="text-[11px] font-semibold text-brand-600">{post.categoryName}</span>
      </div>

      <h3 className="flex items-center gap-1.5 truncate text-[15px] font-bold leading-snug text-ink">
        <span className="truncate">{post.title}</span>
        {post.hasImage && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />}
        {post.commentCount > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand-600">
            <MessageCircle className="h-3 w-3" />
            {post.commentCount}
          </span>
        )}
      </h3>

      <div className="flex items-center gap-2 text-[11px] text-ink-faint">
        <span className="font-medium text-ink-soft">{post.authorDisplayName}</span>
        <span>{format(new Date(post.createdAt), 'MM.dd HH:mm')}</span>
        <span>조회 {post.viewCount}</span>
        <span>추천 {post.upvoteCount}</span>
      </div>
    </Link>
  );
}
