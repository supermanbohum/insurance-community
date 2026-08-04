import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { listMonthlyTopBranches } from '@/lib/public/branch';
import { BranchCard } from '@/components/branch/BranchCard';

export const metadata: Metadata = {
  title: '이달의 인기지점 TOP 30',
  description: '이번 달 가장 많이 조회된 보험대리점 순위를 확인하세요.',
  alternates: { canonical: '/popular' },
};

export const dynamic = 'force-dynamic';

export default async function PopularBranchesPage() {
  const branches = await listMonthlyTopBranches(30);
  const now = new Date();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-6 pt-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
          <Flame className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-ink">이달의 인기지점 TOP {branches.length || 30}</h1>
          <p className="text-xs text-ink-faint">
            {now.getMonth() + 1}월, 가장 많이 조회된 지점 순위입니다
          </p>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line py-16 text-ink-faint">
          <p className="text-sm">이번 달 아직 조회 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {branches.map((b, i) => (
            <BranchCard key={b.id} branch={b} rank={i + 1} showMeta />
          ))}
        </div>
      )}

      <Link href="/search" className="text-center text-xs font-medium text-ink-faint hover:text-brand-600">
        전체 지점 둘러보기
      </Link>
    </div>
  );
}
