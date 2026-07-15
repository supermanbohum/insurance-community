import Link from 'next/link';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { PublicPostSummary } from '@/types/database';

export function PostCard({ post }: { post: PublicPostSummary }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className={clsx(
        'block border-b border-gray-100 px-4 py-2.5 hover:bg-gray-50',
        post.isNotice && 'bg-brand-50/60'
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-brand-700">
        {post.isNotice && <span className="rounded bg-red-600 px-1 py-0.5 font-semibold text-white">공지</span>}
        {post.isPinned && <span className="font-semibold text-gray-500">고정</span>}
        {post.isBest && <span className="font-semibold text-orange-600">인기</span>}
        {post.isEditorPick && <span className="font-semibold text-brand-600">에디터픽</span>}
        <span>{post.categoryName}</span>
      </div>

      <h3 className="mt-0.5 truncate text-[15px] font-medium leading-snug text-gray-900">
        {post.title}
        {post.commentCount > 0 && (
          <span className="ml-1 text-sm font-semibold text-orange-600">[{post.commentCount}]</span>
        )}
        {post.hasImage && <span className="ml-1 text-xs text-gray-400">[사진]</span>}
      </h3>

      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
        <span>{post.authorDisplayName}</span>
        <span>{format(new Date(post.createdAt), 'MM.dd HH:mm')}</span>
        <span>조회 {post.viewCount}</span>
        <span>추천 {post.upvoteCount}</span>
      </div>
    </Link>
  );
}
