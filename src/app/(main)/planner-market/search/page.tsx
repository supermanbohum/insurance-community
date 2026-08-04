import type { Metadata } from 'next';
import { listPublicPlannerProfiles } from '@/lib/public/planner-market.supabase';
import { listRegions } from '@/lib/admin/branch';
import { PlannerMarketSearchFilters } from '@/components/planner-market/PlannerMarketSearchFilters';
import { PlannerCard } from '@/components/planner-market/PlannerCard';

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
