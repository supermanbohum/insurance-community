import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { BadgeCheck } from 'lucide-react';
import { getPostDetail } from '@/lib/posts/query';
import { renderAdminPostContent } from '@/lib/posts/render-admin-markdown';
import { markdownToPlainText } from '@/lib/posts/markdown-to-plaintext';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DeletePostButton } from '@/components/post/DeletePostButton';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumb } from '@/components/seo/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { discussionPostJsonLd } from '@/lib/seo/jsonld';

export const dynamic = 'force-dynamic';

function truncate(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getPostDetail(params.id);
  if (!result) return {};

  const { post } = result;
  const title = post.title;
  const description = truncate(post.author_name_type === 'admin' ? markdownToPlainText(post.content) : post.content, 120);

  return {
    title,
    description,
    alternates: { canonical: `/post/${post.id}` },
    openGraph: { title, description },
    // 관리자가 색인 제외 처리한 글(is_seo_indexable=false)은 검색결과에 노출하지 않는다.
    ...(post.is_seo_indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  // 조회수 집계(중복 방지 포함)를 먼저 반영한 뒤 게시글을 조회해야,
  // 이번 진입으로 증가한 값이 같은 렌더링에서 바로 표시된다.
  await supabase.rpc('record_post_view', { p_post_id: params.id });

  const result = await getPostDetail(params.id);

  if (!result) {
    notFound();
  }

  const { post, images, isOwner } = result;

  const imageUrls = images.map((image) => ({
    id: image.id,
    url: supabase.storage.from('post-images').getPublicUrl(image.storage_path).data.publicUrl,
  }));

  const viewCount = post.organic_view_count + post.imported_view_count + post.correction_view_count;
  const upvoteCount = post.organic_upvote_count + post.imported_upvote_count + post.correction_upvote_count;
  const backHref = post.categories?.slug ? `/board/${post.categories.slug}` : '/';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
      <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-4 shadow-card lg:p-6">
        <JsonLd
          data={discussionPostJsonLd({
            id: post.id,
            title: post.title,
            content: post.author_name_type === 'admin' ? markdownToPlainText(post.content) : post.content,
            authorDisplayName: post.author_display_name,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
          })}
        />
        <Breadcrumb
          items={[
            { label: '홈', href: '/' },
            ...(post.categories ? [{ label: post.categories.name, href: `/board/${post.categories.slug}` }] : []),
            { label: post.title },
          ]}
        />
        <div className="text-xs font-bold text-brand-600">{post.categories?.name}</div>
        <h1 className="mt-1 break-words text-lg font-extrabold leading-snug text-ink">{post.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-line pb-3 text-xs text-ink-faint">
          {post.author_name_type === 'admin' ? (
            <span className="flex max-w-[10rem] items-center gap-0.5 truncate font-bold text-brand-600">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" /> {post.author_display_name}
            </span>
          ) : (
            <span className="max-w-[10rem] truncate font-medium text-ink-soft">{post.author_display_name}</span>
          )}
          <span>{format(new Date(post.created_at), 'yyyy.MM.dd HH:mm')}</span>
          <span>조회 {viewCount}</span>
          <span>추천 {upvoteCount}</span>
        </div>

        {post.author_name_type === 'admin' ? (
          <div
            className="prose-admin-post break-words py-4 text-[15px] leading-7 text-ink-soft"
            dangerouslySetInnerHTML={{ __html: renderAdminPostContent(post.content) }}
          />
        ) : (
          <div className="whitespace-pre-wrap break-words py-4 text-[15px] leading-7 text-ink-soft">
            {post.content}
          </div>
        )}

        {post.author_name_type === 'admin' && post.source_url && (
          <a
            href={post.source_url}
            target="_blank"
            rel="noreferrer"
            className="mb-2 block truncate text-xs font-medium text-brand-600 hover:underline"
          >
            출처: {post.source_url}
          </a>
        )}

        {post.author_name_type === 'admin' && (
          <p className="mb-2 rounded-xl bg-surface-sunken px-3.5 py-3 text-xs leading-relaxed text-ink-faint">
            이 글은 보험맵 운영팀이 작성했습니다. 보험맵은 보험상품을 판매·중개하지 않습니다.
          </p>
        )}

        {imageUrls.length > 0 && (
          <div className="space-y-3 pb-2">
            {imageUrls.map((image) => (
              <div key={image.id} className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-sunken">
                <Image src={image.url} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="object-contain" />
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="flex items-center gap-2 border-t border-line pt-3">
            <Link
              href={`/post/${post.id}/edit`}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-600"
            >
              수정
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <Link href={backHref} className="text-sm font-medium text-ink-faint hover:text-brand-600">
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>

      <Sidebar />
    </div>
  );
}
