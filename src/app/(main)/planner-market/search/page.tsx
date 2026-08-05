import type { Metadata } from 'next';
import { listPublicPlannerProfiles } from '@/lib/public/planner-market.supabase';
import { listRegions } from '@/lib/admin/branch';
import { PlannerMarketSearchFilters } from '@/components/planner-market/PlannerMarketSearchFilters';
import { PlannerCard } from '@/components/planner-market/PlannerCard';

// 이 페이지는 cookies()를 전혀 읽지 않아(공개 조회 전용) Next.js가 세그먼트 단위로
// 정적/프리페치 캐시가 가능하다고 판단한다 - 그 결과 홈 화면 진입 즉시 백그라운드로
// 실행되는 <Link> 프리페치가 이 페이지의 RSC 응답을 캐시해버리고, 실제 클릭 시
// 그 캐시된(때로는 비어 보이는) 응답을 재사용해 "처음 진입시 목록이 비어 보이고
// 새로고침해야 나온다"는 증상으로 이어졌다. 같은 (main) 아래의 다른 공개 목록
// 페이지(/search, /map, /region 등)는 전부 이미 force-dynamic이라 이 문제가 없었다 -
// 여기도 동일하게 맞춰 세그먼트 캐싱/프리페치 캐시 자체를 막는다.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '설계사 찾기',
  description: '활동지역/경력/전문분야로 구직중인 보험설계사를 검색하세요. 연락처는 열람권으로 확인할 수 있습니다.',
  alternates: { canonical: '/planner-market/search' },
};

/** 설계사 찾기 - 누구나 열람 가능(공개 필드만). 연락처는 상세페이지에서 GA 파트너가
 * 열람권으로 잠금해제해야 볼 수 있다. */
export default async function PlannerMarketSearchPage({
  searchParams,
}: {
  searchParams: { region?: string; minCareer?: string; incomeVerified?: string };
}) {
  const [regions, planners] = await Promise.all([
    listRegions(),
    listPublicPlannerProfiles({
      regionId: searchParams.region,
      minCareerYears: searchParams.minCareer ? Number(searchParams.minCareer) : undefined,
      incomeVerifiedOnly: searchParams.incomeVerified === '1',
      limit: 60,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">설계사 찾기</h1>
        <p className="mt-1 text-sm text-muted-foreground">활동지역/경력/전문분야를 확인하고, 마음에 드는 설계사의 연락처는 열람권으로 확인하세요.</p>
      </div>

      <PlannerMarketSearchFilters
        regions={regions}
        initial={{
          regionId: searchParams.region ?? null,
          minCareerYears: searchParams.minCareer ?? '',
          incomeVerifiedOnly: searchParams.incomeVerified === '1',
        }}
      />

      <p className="text-sm text-muted-foreground">{planners.length}명</p>

      {planners.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-muted-foreground">
          조건에 맞는 설계사가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {planners.map((planner) => (
            <PlannerCard key={planner.id} planner={planner} />
          ))}
        </div>
      )}
    </div>
  );
}
