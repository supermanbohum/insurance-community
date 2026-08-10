import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Trophy } from 'lucide-react';
import { listGaQualityRanking } from '@/lib/public/top-designer.supabase';
import { GaQualityCard } from '@/components/home/carousel/GaQualityCard';

// /top-designer, /planner-market/search와 동일한 이유로 force-dynamic + loading.tsx를
// 함께 둔다 - 이 페이지 자체는 쿠키를 읽지 않는 공개 조회 전용이다.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '우수 GA',
  description: 'TOP 인증 등급을 중심으로, 등록된 설계사 수까지 합산한 GA 점수 순위입니다.',
  alternates: { canonical: '/ga-ranking' },
};

/** 우수GA 전용 목록 페이지(오너 지시, 2026-08-10) - 홈 캐러셀이 상위 10개만 보여주는
 * 것과 달리 전체를 본다. "인기 GA"(/search?sort=views, 조회수 기준)와 나란히 존재하되
 * 기준이 다르다(CTO 지적 - 라벨만 보면 한 글자 차이라 구분이 안 된다) - 이 페이지
 * 상단에 기준을 명시한다. get_ga_quality_ranking() RPC를 홈 캐러셀과 그대로 재사용. */
export default async function GaRankingPage() {
  const gaQuality = await listGaQualityRanking(50);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">🏅 우수 GA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          TOP 인증 등급을 중심으로, 등록된 설계사 수까지 합산한 점수 순위입니다.
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          조회수 기준 랭킹은{' '}
          <Link href="/search?sort=views" className="font-semibold text-brand-600 hover:underline">
            인기 GA
          </Link>
          에서 확인하세요.
        </p>
      </div>

      {gaQuality.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 py-14 text-center">
          <Trophy className="h-10 w-10 text-amber-500" />
          <p className="text-base font-bold text-ink">우수 GA 1위 자리가 비어 있습니다</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            첫 점수를 만드는 GA가 1위로 시작합니다. 소속 설계사의 TOP 인증 등급과 등록 인원이 점수가 됩니다.
          </p>
          {/* CTA가 TOP 인증만 가리키지만 실제로는 ③ 등록만으로도 1점이 붙어 1위가 될
              수 있다 - 콘텐츠팀이 남긴 예약 사항: ③ 폼 배포 시 이 CTA를 다시 검토한다
              (통보 예정). 지금은 TOP 인증만 실제로 신청 가능한 경로라 단일 CTA로 둔다. */}
          <Link
            href="/top-designer-register"
            className="mt-1 flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
          >
            <Award className="h-4 w-4" />
            무료로 TOP 인증 신청하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gaQuality.map((ga, i) => (
            <GaQualityCard key={ga.gaCompanyId} ga={ga} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
