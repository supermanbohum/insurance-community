import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/config';
import { listBranchSlugsForSitemap } from '@/lib/public/branch';
import { listAllRegionsForSitemap } from '@/lib/public/region';
import { listActiveCategorySlugs } from '@/lib/public/categories';

// app/sitemap.ts는 (main) 레이아웃 밖의 독립 라우트라 (main)이 매 요청 cookies()를 읽어
// 강제하는 force-dynamic의 영향을 받지 않는다 - 1시간 단위로 재생성해 DB 부하 없이도
// 새 지점/지역/게시판이 자동으로 sitemap에 반영되게 한다.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [branches, regions, categories] = await Promise.all([
    listBranchSlugsForSitemap(),
    listAllRegionsForSitemap(),
    listActiveCategorySlugs(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/region`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/community`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const branchEntries: MetadataRoute.Sitemap = branches.map((b) => ({
    url: `${SITE_URL}/branch/${b.slug}`,
    lastModified: new Date(b.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const sidoCodes = Array.from(new Set(regions.map((r) => r.sidoCode)));
  const sidoEntries: MetadataRoute.Sitemap = sidoCodes.map((code) => ({
    url: `${SITE_URL}/region/${code}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const sigunguEntries: MetadataRoute.Sitemap = regions
    .filter((r): r is { sidoCode: string; sigunguCode: string } => Boolean(r.sigunguCode))
    .map((r) => ({
      url: `${SITE_URL}/region/${r.sidoCode}/${r.sigunguCode}`,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

  const boardEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/board/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticEntries, ...branchEntries, ...sidoEntries, ...sigunguEntries, ...boardEntries];
}
