import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublicSalaryRanking, type SalaryRankingSort } from '@/lib/public/salary-ranking.supabase';
import { SalaryRankingFilters } from '@/components/salary-ranking/SalaryRankingFilters';
import { SalaryRankingCard } from '@/components/salary-ranking/SalaryRankingCard';
import { SalaryRankingLoadMoreButton } from '@/components/salary-ranking/SalaryRankingLoadMoreButton';

// /planner-market/search와 동일한 이유(그 페이지 주석 참고)로 force-dynamic +
// loading.tsx를 함께 둔다.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { year: string } }): Promise<Metadata> {
  return {
    title: `${params.year}년 전국 설계사 연봉 랭킹`,
    description: `${params.year}년 원천징수영수증으로 연봉을 인증받은 보험설계사 연봉 순위입니다.`,
    alternates: { canonical: `/salary-ranking/${params.year}` },
  };
}

export default async function SalaryRankingYearPage({
  params,
  searchParams,
}: {
  params: { year: string };
  searchParams: { sort?: string };
}) {
  const year = Number(params.year);
  const sort = (searchParams.sort as SalaryRankingSort | undefined) ?? 'income';
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  const submissions = await listPublicSalaryRanking({ year, sort, limit: 50 });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">💰 전국 설계사 연봉 랭킹</h1>
          <p className="mt-1 text-sm text-muted-foreground">원천징수영수증으로 연봉을 인증받은 설계사 순위입니다.</p>
        </div>
        <Link href="/salary-ranking/hall-of-fame" className="shrink-0 text-xs font-medium text-brand-600 hover:underline">
          명예의 전당 →
        </Link>
      </div>

      <SalaryRankingFilters years={years} initial={{ year, sort }} />

      {submissions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-muted-foreground">
          {year}년 등록된 랭킹이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {submissions.map((submission, i) => (
            <SalaryRankingCard key={submission.id} submission={submission} rank={i + 1} />
          ))}
        </div>
      )}

      <SalaryRankingLoadMoreButton initialCount={submissions.length} filters={{ year, sort }} />

      <Link
        href="/salary-ranking/apply"
        className="mx-auto w-fit rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-600"
      >
        내 연봉 등록하기
      </Link>
    </div>
  );
}
