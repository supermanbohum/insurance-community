import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { User } from 'lucide-react';
import { getPublicSalaryRankingSubmission } from '@/lib/public/salary-ranking.supabase';
import { recordSalaryRankingViewAction } from '@/lib/actions/salary-ranking';
import { BackButton } from '@/components/shared/BackButton';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const submission = await getPublicSalaryRankingSubmission(params.id);
  if (!submission) return {};
  return {
    title: `${submission.displayName} · ${submission.rankingYear}년 연봉 ${(submission.annualIncomeKrw / 100_000_000).toLocaleString()}억원`,
    alternates: { canonical: `/salary-ranking/detail/${submission.id}` },
  };
}

export default async function SalaryRankingDetailPage({ params }: { params: { id: string } }) {
  const submission = await getPublicSalaryRankingSubmission(params.id);
  if (!submission) notFound();

  await recordSalaryRankingViewAction(submission.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <BackButton />

      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
          {submission.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={submission.profilePhotoUrl} alt={submission.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-400 to-rose-600 text-white/85">
              <User className="h-9 w-9" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="w-fit rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{submission.rankingYear}년 연봉 랭킹</span>
          <h1 className="text-lg font-bold">{submission.displayName}</h1>
          <p className="text-sm text-ink-soft">
            {submission.jobTitle} · {submission.activeRegionLabel || '지역 미상'}
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-6 text-center">
        <p className="text-sm text-rose-700">인증 연봉</p>
        <p className="mt-1 text-4xl font-extrabold text-rose-700">{(submission.annualIncomeKrw / 100_000_000).toLocaleString()}억원</p>
      </section>
    </div>
  );
}
