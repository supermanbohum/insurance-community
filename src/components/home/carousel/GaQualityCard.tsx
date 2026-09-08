import Link from 'next/link';
import Image from 'next/image';
import { Award } from 'lucide-react';
import type { GaQualityRankingRow } from '@/lib/public/top-designer.supabase';
import { avatarGradient, cn } from '@/lib/utils';

/** "우수 GA" 카드(오너 지시 ⑤, 2026-08-10) - "인기 GA"(조회수 기준 지점 카드)를
 * 대체한다. 개별 지점이 아니라 GA 회사 단위라 PopularGaCard와 구조가 다르다.
 * "실시간"이라는 표현은 쓰지 않는다(디자인 확정 - 산출 주기가 정해지지 않았다).
 *
 * 이미지(오너 지시 2026-08-14): 그 GA의 **공개 지점 중 점수가 가장 높은 지점의
 * 대표사진**을 보여준다(topBranchPhotoUrl - 선정 규칙은 top-designer.supabase.ts).
 * 사진이 없으면 기존 그라디언트+Award로 폴백한다.
 *
 * 🔴 storage 사진은 next/image **고정 width/height**로 그린다. fill+sizes는 lazy
 * 하이드레이션 타이밍에 srcset 최대(w=3840)를 받는 사고가 실측됐고(BranchGallery,
 * 2026-08-14), raw <img>는 SSR에서 원본 preload가 자동으로 붙는다. 고정 크기면
 * srcset이 두 단계뿐이라 최악의 선택도 상한이 잡힌다. */
export function GaQualityCard({ ga, rank }: { ga: GaQualityRankingRow; rank?: number }) {
  return (
    <Link
      href={`/ga/${ga.gaCompanySlug}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <div
        className={cn(
          'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gradient-to-br text-white/85',
          avatarGradient(ga.gaCompanyName)
        )}
      >
        {ga.topBranchPhotoUrl ? (
          ga.topBranchPhotoSource === 'storage' ? (
            // 카드 폭 190~210px → 4:3에서 420×315(DPR2 여유)면 충분하다.
            <Image
              src={ga.topBranchPhotoUrl}
              alt={`${ga.gaCompanyName} 대표 지점 사진`}
              width={420}
              height={315}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            // external은 remotePatterns 밖 도메인이면 next/image 최적화가 실패하므로 원본.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ga.topBranchPhotoUrl}
              alt={`${ga.gaCompanyName} 대표 지점 사진`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <Award className="h-8 w-8" strokeWidth={1.5} />
        )}
        {rank !== undefined && rank <= 3 && (
          <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-amber-600 shadow-sm backdrop-blur">
            🏆 TOP {rank}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-2.5">
        <p className="truncate text-[15px] font-bold text-ink">{ga.gaCompanyName}</p>
        <div className="flex items-center justify-between gap-1.5">
          <span className="flex min-w-0 items-center gap-1 truncate rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            우수 GA 점수 {ga.score.toLocaleString('ko-KR')}
          </span>
          {/* 콘텐츠팀 확정 포맷(2026-08-10) - 인증(certifiedCount)과 등록(registeredCount)을
              분리 표기한다. certifiedCount 하나만 "인증 N명"으로 쓰면 미인증 등록자가
              섞인 registeredCount와 혼동되지 않도록, 항상 둘 다 보여준다. */}
          <span className="shrink-0 text-[11px] text-ink-faint">
            ⭐ 인증 {ga.certifiedCount}명 · 등록 {ga.registeredCount}명
          </span>
        </div>
      </div>
    </Link>
  );
}
