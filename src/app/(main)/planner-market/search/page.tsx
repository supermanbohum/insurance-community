import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus, Edit3 } from 'lucide-react';
import { listPublicPlannerProfiles } from '@/lib/public/planner-market.supabase';
import { listRegions } from '@/lib/admin/branch';
import { PlannerMarketSearchFilters } from '@/components/planner-market/PlannerMarketSearchFilters';
import { PlannerCard } from '@/components/planner-market/PlannerCard';
import { PLANNER_MARKET_LABEL } from '@/lib/config/labels';

// 이 페이지는 cookies()를 전혀 읽지 않아(공개 조회 전용) Next.js가 세그먼트 단위로
// 정적/프리페치 캐시가 가능하다고 판단한다. force-dynamic만으로는 서버 응답에
// no-store 헤더가 붙을 뿐, 홈 화면 진입 즉시 백그라운드로 실행되는 <Link> 프리페치
// 문제는 해결되지 않는다 - loading.tsx가 없는 완전 동적 페이지는 Next가 실제 목록
// 없이 "정적 셸"만 프리페치해 캐시해두고, 클릭 시 그 셸(비어 보임)을 그대로
// 최종 결과로 재사용해버린다("처음 진입시 목록이 비어 보이고 새로고침해야 나온다").
// 같은 (main) 아래의 /search가 이 문제를 안 겪는 이유는 이미 loading.tsx가 있어서다 -
// 이 페이지에도 loading.tsx를 추가해 프리페치가 항상 로딩 스켈레톤까지만 캐시하고,
// 실제 목록은 진짜 이동 시점에 매번 새로 가져오도록 만든다(핵심 수정은 loading.tsx
// 쪽이고, force-dynamic은 서버 측 캐시를 막기 위한 보조 장치).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: PLANNER_MARKET_LABEL,
  description: '활동지역/경력/전문분야로 구직중인 보험설계사를 검색하세요. 연락처는 열람권으로 확인할 수 있습니다.',
  alternates: { canonical: '/planner-market/search' },
};

/** 설계사 찾기(=설계사Market) - 누구나 열람 가능(공개 필드만). 연락처는 상세페이지에서
 * GA 파트너가 열람권으로 잠금해제해야 볼 수 있다. 햄버거 메뉴가 예전엔 "설계사 찾기/
 * 등록/수정" 3줄이었는데 이 페이지 하나로 통합됐다(오너 지시, 2026-08-10) - 등록/수정
 * 진입점은 이 페이지 상단 버튼 2개로 옮겼다. */
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{PLANNER_MARKET_LABEL}</h1>
          <p className="mt-1 text-sm text-muted-foreground">활동지역/경력/전문분야를 확인하고, 마음에 드는 설계사의 연락처는 열람권으로 확인하세요.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/planner-market/register"
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {PLANNER_MARKET_LABEL} 등록
          </Link>
          <Link
            href="/planner-market/edit"
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {PLANNER_MARKET_LABEL} 수정
          </Link>
        </div>
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
