import Link from 'next/link';
import { format } from 'date-fns';
import type { PublicPostSummary } from '@/types/database';

export function PostCard({ post }: { post: PublicPostSummary }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className="block border-b border-gray-100 px-4 py-3 hover:bg-gray-50"
    >
      <div className="flex items-center gap-1.5 text-xs text-brand-600">
        {post.isNotice && <span className="font-semibold">[공지]</span>}
        {post.isPinned && <span className="font-semibold text-gray-500">[고정]</span>}
        {post.isBest && <span className="font-semibold text-orange-500">[베스트]</span>}
        {post.isEditorPick && <span className="font-semibold text-brand-600">[에디터픽]</span>}
        <span>{post.categoryName}</span>
      </div>

      <h3 className="mt-1 truncate text-sm font-medium text-gray-900">
        {post.title}
        {post.hasImage && <span className="ml-1 text-gray-400">[사진]</span>}
        {post.commentCount > 0 && (
          <span className="ml-1 text-brand-600">[{post.commentCount}]</span>
        )}
      </h3>

      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
        <span>{post.authorDisplayName}</span>
        <span>{format(new Date(post.createdAt), 'MM.dd HH:mm')}</span>
        <span>조회 {post.viewCount}</span>
        <span>추천 {post.upvoteCount}</span>
      </div>
    </Link>
  );
}
