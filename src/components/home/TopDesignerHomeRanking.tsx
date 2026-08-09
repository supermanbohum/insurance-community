import Link from 'next/link';
import { Trophy } from 'lucide-react';
import type { TopDesignerRankingRow } from '@/lib/public/top-designer.supabase';

/** 홈 하단 TOP 설계사 랭킹 - 오너 사양: "GA/본부(지점)/이름"만 표기, 프로필(사진·연봉
 * 금액)은 절대 노출하지 않는다. 이름을 누르면 해당 설계사의 TOP 설계사 개인 상세로
 * 이동한다. 연봉 기준 정렬은 RPC가 서버에서 이미 끝내고 왔다(클라이언트는 순서를
 * 모른다 - income 컬럼 자체가 응답에 없다).
 *
 * 순위 숫자 강조는 콘텐츠팀 임계 원칙(N>10에서만 표시)을 따른다 - 소수일 때 "1위"가
 * 의미가 없다는 이유. 서버에서 11건까지 받아 10건 초과 여부만 판별하고, 실제로는
 * 최대 10건만 렌더링한다. */
export function TopDesignerHomeRanking({ rows }: { rows: TopDesignerRankingRow[] }) {
  const showRankNumbers = rows.length > 10;
  const visibleRows = rows.slice(0, 10);

  if (visibleRows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 py-10 text-center">
        <Trophy className="h-9 w-9 text-amber-500" />
        <div>
          <p className="text-base font-bold text-ink">설계사 랭킹 — 1호의 자리가 비어 있습니다</p>
          <p className="mt-1 text-sm text-ink-soft">지금 등록하면 첫 번째로 이름을 올립니다</p>
        </div>
        <Link
          href="/top-designer-register"
          className="mt-1 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
        >
          설계사 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-2">
      {visibleRows.map((row, i) => (
        <Link
          key={row.id}
          href={`/top-designer/${row.id}`}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-amber-50"
        >
          {showRankNumbers && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">
              {i + 1}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
            {row.gaCompanyName}
            {row.branchName ? ` · ${row.branchName}` : ''}
          </span>
          <span className="shrink-0 text-sm font-bold text-ink underline-offset-2 hover:underline">{row.name} 설계사</span>
        </Link>
      ))}
    </div>
  );
}
