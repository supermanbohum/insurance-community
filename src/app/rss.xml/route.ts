import { SITE_URL } from '@/lib/seo/config';
import { SITE_CONFIG } from '@/lib/config/site';
import { listRecentPostsForRss } from '@/lib/posts/query';

export const revalidate = 3600;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/** 네이버 서치어드바이저 RSS 제출용 피드 - sitemap.xml과 동일한 공개(visible +
 * is_seo_indexable) 게시글만 최신순으로 담는다. 지점/설계사마켓처럼 계속 갱신되는
 * 콘텐츠가 아니라 커뮤니티 게시글이 RSS 성격에 가장 잘 맞아 이것만 담는다. */
export async function GET() {
  const posts = await listRecentPostsForRss(50);

  const items = posts
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/post/${post.id}</link>
      <guid isPermaLink="true">${SITE_URL}/post/${post.id}</guid>
      <description>${escapeXml(truncate(post.content, 200))}</description>
      <author>${escapeXml(post.authorDisplayName)}</author>
      ${post.categoryName ? `<category>${escapeXml(post.categoryName)}</category>` : ''}
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.name)} - 보험 커뮤니티</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <language>ko</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
