import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Trophy, UserPlus } from 'lucide-react';
import { listGaQualityRanking, listGaQualityRankingByRegion } from '@/lib/public/top-designer.supabase';
import { listSidoGroups, listAllSigunguRegions } from '@/lib/public/region';
import { GaQualityCard } from '@/components/home/carousel/GaQualityCard';
import { GaRankingRegionPicker } from '@/components/ga-ranking/GaRankingRegionPicker';

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
 * 상단에 기준을 명시한다. get_ga_quality_ranking() RPC를 홈 캐러셀과 그대로 재사용.
 *
 * ⑨ 우리 동네 순위(오너 지시 "우리동네 제작해 만들어만둬", 2026-08-10) - region/sigungu
 * 쿼리파라미터로 같은 페이지에서 지역 랭킹도 볼 수 있게 얹었다. 화면 위치·최종 문구는
 * 콘텐츠팀이 정할 예정이라(CTO 위임) 지금은 기존 우수GA 페이지에 임시로 붙여둔다 -
 * "만들어는 두되" 자리는 콘텐츠 확정 후 옮길 수 있게 컴포넌트를 분리해뒀다. */
export default async function GaRankingPage({ searchParams }: { searchParams: { region?: string; sigungu?: string } }) {
  const sidoCode = searchParams.region?.trim() ?? '';
  const sigunguRegionId = searchParams.sigungu?.trim() ?? '';

  const [gaQuality, sidoOptions, sigunguOptions] = await Promise.all([
    sidoCode ? listGaQualityRankingByRegion(sidoCode, sigunguRegionId || null, 50) : listGaQualityRanking(50),
    listSidoGroups(),
    listAllSigunguRegions(),
  ]);

  const sidoName = sidoOptions.find((s) => s.sidoCode === sidoCode)?.sidoName ?? '';
  // sigungu가 sidoCode에 안 속하면(낡은/조작된 링크) 라벨에서도 무시한다 - B2와 동일한
  // 방어 논리(RPC 쪽은 이미 안전하지만 화면 라벨이 엉뚱한 조합을 보여주지 않게).
  const sigunguName = sigunguOptions.find((s) => s.regionId === sigunguRegionId && s.sidoCode === sidoCode)?.sigunguName ?? '';
  const regionLabel = sidoCode ? `${sidoName}${sigunguName ? ` ${sigunguName}` : ''}` : '';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        {/* 이름 확정(콘텐츠, CTO 승인) - "우리 동네 순위"는 무엇의 순위인지 모호해
            지점 순위로 읽힌다. "우수GA의 지역판"임이 이름에서 드러나야 한다. */}
        <h1 className="text-xl font-bold">🏅 {regionLabel ? `${regionLabel} 우수 GA` : '우수 GA'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {regionLabel
            ? // B 해석을 부제에 명시한다 - "여기 지점 하나 있는 전국 1등 GA"가 아니라는 걸
              // 사용자가 읽어서 알 수 있어야 한다.
              '이 지역 지점에 소속된 설계사들의 점수만 합산한 순위입니다'
            : 'TOP 인증 등급을 중심으로, 등록된 설계사 수까지 합산한 점수 순위입니다.'}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          조회수 기준 랭킹은{' '}
          <Link href="/search?sort=views" className="font-semibold text-brand-600 hover:underline">
            인기 GA
          </Link>
          에서 확인하세요.
        </p>
      </div>

      <GaRankingRegionPicker sidoOptions={sidoOptions} sigunguOptions={sigunguOptions} currentSido={sidoCode} currentSigungu={sigunguRegionId} />

      {gaQuality.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 py-14 text-center">
          <Trophy className="h-10 w-10 text-amber-500" />
          {/* 콘텐츠 확정 빈 상태 - "왜 비었나"를 설명하는 대신 선점 프레임("첫 점수를
              만드는 GA가 이 지역 1위")으로 바꾸고, 다음 행동 2개로 막다른 길을 없앴다. */}
          <p className="text-base font-bold text-ink">
            {regionLabel ? `${regionLabel}에는 아직 순위가 없습니다` : '우수 GA 1위 자리가 비어 있습니다'}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {regionLabel
              ? '이 지역 지점에 소속된 설계사가 등록되면 점수가 쌓이기 시작합니다. 첫 점수를 만드는 GA가 이 지역 1위로 시작합니다.'
              : '첫 점수를 만드는 GA가 1위로 시작합니다. 소속 설계사의 TOP 인증 등급과 등록 인원이 점수가 됩니다.'}
          </p>
          {regionLabel ? (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/branch-planner-register"
                className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                <UserPlus className="h-4 w-4" />
                우리 지점 설계사 등록
              </Link>
              <Link
                href="/ga-ranking"
                className="rounded-full border border-brand-600 px-5 py-2.5 text-sm font-bold text-brand-600 transition-colors hover:bg-[#F0F6FF]"
              >
                전국 순위 보기
              </Link>
            </div>
          ) : (
            /* 전국 빈 상태는 기존 CTA 유지 - TOP 인증만 실제로 신청 가능한 경로다.
               ③ 폼 배포 시 이 CTA를 다시 검토하기로 콘텐츠팀과 예약돼 있다. */
            <Link
              href="/top-designer-register"
              className="mt-1 flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
            >
              <Award className="h-4 w-4" />
              무료로 TOP 인증 신청하기
            </Link>
          )}
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
