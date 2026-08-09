import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Trophy } from 'lucide-react';
import { listPublicTopDesigners, type TopDesignerSort } from '@/lib/public/top-designer.supabase';
import { TopDesignerFilters } from '@/components/top-designer/TopDesignerFilters';
import { TopDesignerCard } from '@/components/top-designer/TopDesignerCard';
import { TopDesignerLoadMoreButton } from '@/components/top-designer/TopDesignerLoadMoreButton';
import { STAR_TIER_LABEL, STAR_TIER_OPTIONS, type StarTier } from '@/lib/top-designer/labels';

// /planner-market/search와 동일한 이유(그 페이지 주석 참고)로 force-dynamic +
// loading.tsx를 함께 둔다 - 이 페이지 자체는 쿠키를 읽지 않는 공개 조회 전용이다.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TOP 설계사',
  description: '원천징수영수증으로 연봉을 인증받은 보험맵 공식 TOP 설계사를 만나보세요.',
  alternates: { canonical: '/top-designer' },
};

export default async function TopDesignerPage({
  searchParams,
}: {
  searchParams: { starTier?: string; sort?: string };
}) {
  const starTier = (searchParams.starTier as StarTier | undefined) ?? undefined;
  const sort = (searchParams.sort as TopDesignerSort | undefined) ?? 'newest';

  const designers = await listPublicTopDesigners({ starTier, sort, limit: 24 });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">🏆 TOP 설계사</h1>
          <p className="mt-1 text-sm text-muted-foreground">원천징수영수증으로 연봉을 인증받은 보험맵 공식 TOP 설계사입니다.</p>
        </div>
        {/* 상시 신청 버튼(W-001) - 목록 위치와 무관하게 항상 눈에 띄게 노출. */}
        <Link
          href="/top-designer/apply"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-card transition-colors hover:bg-amber-600"
        >
          <Award className="h-4 w-4" />
          인증 신청
        </Link>
      </div>

      {/* 별등급 안내(W-001) - 등급 체계를 목록 진입 즉시 이해할 수 있게 상단에 고정 노출. */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
        {STAR_TIER_OPTIONS.map((tier) => (
          <span key={tier} className="rounded-full bg-white px-2.5 py-1 shadow-sm">
            {STAR_TIER_LABEL[tier]}
          </span>
        ))}
      </div>

      <TopDesignerFilters initial={{ starTier: starTier ?? null, sort }} />

      {designers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 py-14 text-center">
          <Trophy className="h-10 w-10 text-amber-500" />
          <p className="text-base font-bold text-ink">1호 TOP 설계사가 되어보세요</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            원천징수영수증으로 연봉을 인증하면 운영팀 검토 후 별등급 배지와 함께 이 페이지에 가장 먼저 노출됩니다.
          </p>
          <Link
            href="/top-designer/apply"
            className="mt-1 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
          >
            TOP 설계사 인증 신청하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {designers.map((designer) => (
            <TopDesignerCard key={designer.id} designer={designer} />
          ))}
        </div>
      )}

      <TopDesignerLoadMoreButton initialCount={designers.length} filters={{ starTier, sort }} />
    </div>
  );
}
