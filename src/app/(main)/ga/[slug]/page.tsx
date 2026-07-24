import { redirect } from 'next/navigation';
import { getGaRedirectTarget } from '@/lib/public/ga';

export const dynamic = 'force-dynamic';

/**
 * GA는 더 이상 자체 상세페이지를 갖지 않는다(회사 정보/로고/브랜드 소개만 갖는 상위 엔티티).
 * 옛 /ga/[slug] 링크가 들어오면 그 회사의 본사 지점(또는 유일한 지점)으로,
 * 그마저 없으면 검색 결과로 보낸다.
 */
export default async function GaRedirectPage({ params }: { params: { slug: string } }) {
  // /branch/[slug]와 동일한 이유로 명시적 디코딩 필요.
  const target = await getGaRedirectTarget(decodeURIComponent(params.slug));

  if (!target.found) {
    redirect('/search');
  }
  if (target.branchSlug) {
    redirect(`/branch/${target.branchSlug}`);
  }
  redirect(`/search?q=${encodeURIComponent(target.gaName ?? '')}`);
}
