import Link from 'next/link';
import { Award } from 'lucide-react';
import type { GaQualityRankingRow } from '@/lib/public/top-designer.supabase';
import { avatarGradient, cn } from '@/lib/utils';

/** "우수 GA" 카드(오너 지시 ⑤, 2026-08-10) - "인기 GA"(조회수 기준 지점 카드)를
 * 대체한다. 개별 지점이 아니라 GA 회사 단위라 PopularGaCard와 구조가 다르다
 * (사진·주소 없음, 점수·인증 설계사 수만). "실시간"이라는 표현은 쓰지 않는다
 * (디자인 확정 - 산출 주기가 정해지지 않았다). */
export function GaQualityCard({ ga, rank }: { ga: GaQualityRankingRow; rank?: number }) {
  return (
    <Link
      href={`/ga/${ga.gaCompanySlug}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <div
        className={cn(
          'relative flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br text-white/85',
          avatarGradient(ga.gaCompanyName)
        )}
      >
        <Award className="h-8 w-8" strokeWidth={1.5} />
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
          <span className="shrink-0 text-[11px] text-ink-faint">인증 {ga.certifiedDesignerCount}명</span>
        </div>
      </div>
    </Link>
  );
}
