import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/config';
import { listBranchSlugsForSitemap } from '@/lib/public/branch';
import { listAllRegionsForSitemap } from '@/lib/public/region';
import { listActiveCategorySlugs } from '@/lib/public/categories';
import { listPostIdsForSitemap } from '@/lib/posts/query';
import { listPlannerProfileIdsForSitemap } from '@/lib/public/planner-market.supabase';
import { listTopDesignerIdsForSitemap } from '@/lib/public/top-designer.supabase';

// 예전에는 `revalidate = 3600`(1시간 재생성)이었다. 2026-08-13에 공개 클라이언트가 fetch를
// no-store로 강제하게 되면서(src/lib/supabase/public.ts — "승인했는데 안 보인다" 대응)
// 이 라우트를 정적으로 프리렌더할 수 없게 됐고, `revalidate`를 남겨 두면 **빌드가 깨진다**
// ("Dynamic server usage: no-store fetch ... /sitemap.xml"). 그래서 동적으로 돌린다.
//
// 받아들인 트레이드오프: 크롤러 요청마다 조회 6건이 DB로 나간다. sitemap은 검색엔진이
// 하루 몇 번 부르는 경로라 부하보다 최신성(새 지점이 즉시 sitemap에 반영)이 낫다고 봤다.
// 부하가 문제가 되면 되돌리는 방법은 revalidate를 되살리는 게 아니라 이 조회들을
// unstable_cache로 감싸는 것이다 — 공개 클라이언트의 no-store는 되돌리면 안 된다.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [branches, regions, categories, posts, planners, topDesigners] = await Promise.all([
    listBranchSlugsForSitemap(),
    listAllRegionsForSitemap(),
    listActiveCategorySlugs(),
    listPostIdsForSitemap(),
    listPlannerProfileIdsForSitemap(),
    listTopDesignerIdsForSitemap(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/map`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/region`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/community`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/popular`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/top-register`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/planner-market`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/planner-market/search`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/top-designer`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/salary-ranking`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/salary-ranking/hall-of-fame`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/delete-account`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/post/${p.id}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const plannerEntries: MetadataRoute.Sitemap = planners.map((p) => ({
    url: `${SITE_URL}/planner-market/${p.id}`,
    lastModified: new Date(p.createdAt),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const topDesignerEntries: MetadataRoute.Sitemap = topDesigners.map((d) => ({
    url: `${SITE_URL}/top-designer/${d.id}`,
    lastModified: new Date(d.createdAt),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

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

  return [
    ...staticEntries,
    ...branchEntries,
    ...sidoEntries,
    ...sigunguEntries,
    ...boardEntries,
    ...postEntries,
    ...plannerEntries,
    ...topDesignerEntries,
  ];
}
