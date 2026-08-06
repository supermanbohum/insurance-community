import type { Metadata } from 'next';
import Image from 'next/image';
import { User } from 'lucide-react';
import { getSalaryRankingHallOfFame } from '@/lib/public/salary-ranking.supabase';
import { avatarGradient, cn } from '@/lib/utils';
import { BackButton } from '@/components/shared/BackButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '명예의 전당',
  description: '전국 설계사 연봉 랭킹 연도별 1위를 영구 보관합니다.',
  alternates: { canonical: '/salary-ranking/hall-of-fame' },
};

/** 연도별 1위 - 별도 테이블 없이 get_salary_ranking_hall_of_fame() 파생 조회로
 * 계산한다(salary_ranking_submissions 행이 삭제되지 않는 한 자연히 영구 보관됨). */
export default async function SalaryRankingHallOfFamePage() {
  const entries = await getSalaryRankingHallOfFame();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold">🏆 명예의 전당</h1>
        <p className="mt-1 text-sm text-muted-foreground">전국 설계사 연봉 랭킹 연도별 1위입니다.</p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-muted-foreground">
          아직 등록된 챔피언이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.rankingYear}
              className="flex items-center gap-4 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-card"
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl">🏆</span>
                <span className="text-xs font-bold text-amber-700">{entry.rankingYear} Champion</span>
              </div>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
                {entry.profilePhotoUrl ? (
                  <Image src={entry.profilePhotoUrl} alt={entry.displayName} fill sizes="56px" className="object-cover" />
                ) : (
                  <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br text-white/85', avatarGradient(entry.submissionId))}>
                    <User className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <p className="text-base font-bold text-ink">{entry.displayName}</p>
                <p className="text-xs text-ink-soft">{entry.jobTitle}</p>
              </div>
              <p className="text-lg font-extrabold text-amber-700">{(entry.annualIncomeKrw / 100_000_000).toLocaleString()}억원</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
