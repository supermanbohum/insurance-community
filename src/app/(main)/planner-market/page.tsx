import Link from 'next/link';
import { Search, UserPlus, Ticket } from 'lucide-react';
import { listPublicPlannerProfiles } from '@/lib/public/planner-market.supabase';
import { PlannerCard } from '@/components/planner-market/PlannerCard';

/** 설계사 마켓 메인 - 누구나 열람 가능. GA↔설계사 양방향 리쿠르팅의 진입점. */
export default async function PlannerMarketHomePage() {
  const recentPlanners = await listPublicPlannerProfiles({ limit: 8 });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <section className="rounded-3xl border border-line bg-gradient-to-br from-brand-50 to-white p-8 text-center">
        <h1 className="text-2xl font-extrabold">설계사 마켓</h1>
        <p className="mt-2 text-sm text-ink-soft">좋은 설계사를 찾는 GA, 좋은 GA를 찾는 설계사가 만나는 곳</p>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            href="/planner-market/search"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white py-4 text-sm font-bold shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <Search className="h-5 w-5 text-emerald-500" />
            설계사 찾기
          </Link>
          <Link
            href="/planner-market/register"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white py-4 text-sm font-bold shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <UserPlus className="h-5 w-5 text-indigo-500" />
            설계사 등록
          </Link>
          <Link
            href="/planner-market/purchase"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white py-4 text-sm font-bold shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <Ticket className="h-5 w-5 text-amber-500" />
            열람권 구매
          </Link>
        </div>
      </section>

      {recentPlanners.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">최근 등록된 설계사</h2>
            <Link href="/planner-market/search" className="text-xs font-medium text-brand-600 hover:underline">
              전체보기
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentPlanners.map((planner) => (
              <PlannerCard key={planner.id} planner={planner} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
