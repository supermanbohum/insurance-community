import Link from 'next/link';
import { Megaphone, MessageSquareText, Plus, UserPlus } from 'lucide-react';
import type { HomeStats } from '@/lib/public/branch';
import { StatCountUp } from '@/components/home/StatCountUp';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';

/**
 * 헤더에 이미 로고+검색창이 있어(BohomMapHeader) 예전 HeroSearch가 그걸 그대로
 * 반복하고 있었다 - 그 자리를 "지점을 등록하고 싶은 사람"과 "설계사로 등록하고
 * 싶은 사람"을 위한 동일 비중의 큰 CTA 2개 + "지금 서비스가 살아있다"는 걸
 * 보여주는 정보 영역으로 바꾼다.
 *
 * TOP설계사 등록 버튼은 메인에서 완전히 제거했다(햄버거 메뉴 "인증" 그룹으로
 * 이동, BohomMapHeader.tsx 참고) - TOP설계사 기능 자체(DB/API/관리자)는 그대로
 * 유지되며 이 설계사 등록(리크루팅) 시스템과는 절대 혼용하지 않는다.
 */

/** 홈 통계 표시 임계값(W-054, CTO 확정) - 지표별로 독립 판정한다: 지점이 임계값
 * 미만이어도 설계사가 넘으면 설계사는 그대로 실제 숫자를 보여준다("전부 아니면
 * 전무" 방식 금지). 미만인 지표만 숫자 대신 CTA성 대체 문구로 바뀐다 - "설계사
 * 2명"처럼 자랑이 안 되는 한 자릿수는 "0명"보다 나을 게 없다는 판단. 데이터가
 * 늘면서 계속 조정할 값이라 상수로 모아둔다. */
const HOME_STAT_THRESHOLDS = {
  branch: 10,
  planner: 10,
  visitor: 100,
} as const;

const STAT_MIN_TODAY_COUNT = 1;

function StatChip({ emoji, label, value, unit }: { emoji: string; label: string; value: number; unit: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
      {emoji} {label} <span className="text-brand-600"><StatCountUp value={value} /></span>{unit}
    </span>
  );
}

/** 임계값 미만일 때 숫자 대신 보여주는 CTA 카드 - 긴 판(2줄)/짧은 판(1줄)을 둘 다
 * 렌더링해두고 뷰포트 폭으로 전환한다(별도 클라이언트 JS 없이 반응형 처리). */
function ReplacementCard({
  href,
  longLines,
  shortLine,
}: {
  href: string;
  longLines: [string, React.ReactNode];
  shortLine: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-0.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-3 py-2 text-center transition-colors hover:bg-brand-50"
    >
      <span className="hidden sm:block">
        <span className="block text-[11px] text-ink-faint">{longLines[0]}</span>
        <span className="block text-[13px] font-bold text-ink-soft">{longLines[1]}</span>
      </span>
      <span className="text-[13px] font-bold text-ink-soft sm:hidden">{shortLine}</span>
    </Link>
  );
}

export function HomeRegisterHero({ stats, ctaLabel = '우리 지점 등록하기' }: { stats: HomeStats; ctaLabel?: string }) {
  const showBranchNumber = stats.branchCount >= HOME_STAT_THRESHOLDS.branch;
  const showPlannerNumber = stats.publicPlannerProfileCount >= HOME_STAT_THRESHOLDS.planner;
  const showVisitorNumber = stats.todayVisitorCount >= HOME_STAT_THRESHOLDS.visitor;
  const showTodayChip = stats.todayCount >= STAT_MIN_TODAY_COUNT;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HeroCtaButton
          href="/register"
          label={ctaLabel}
          icon={<Plus className="h-6 w-6" strokeWidth={2.5} />}
          gradientClassName="from-brand-500 via-brand-600 to-brand-800"
          glowColor="rgba(37,99,235,0.45)"
        />
        <HeroCtaButton
          href="/planner-market/register"
          label="설계사 등록하기"
          icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
          gradientClassName="from-indigo-500 via-violet-600 to-violet-800"
          glowColor="rgba(124,58,237,0.45)"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/board/notice"
          className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-white py-3.5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <Megaphone className="h-4 w-4 text-slate-500" />
          <span className="text-[11px] font-bold text-ink-soft">공지사항</span>
        </Link>
        <Link
          href="/board/review"
          className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-white py-3.5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <MessageSquareText className="h-4 w-4 text-brand-500" />
          <span className="text-[11px] font-bold text-ink-soft">실시간 후기</span>
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        {showBranchNumber ? (
          <div className="rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3">
            <StatChip emoji="📍" label="등록 지점" value={stats.branchCount} unit="개" />
          </div>
        ) : (
          <ReplacementCard
            href="/register"
            longLines={[
              '지점장님의 지역은 아직 비어 있습니다',
              // "6개월 무료(선착순 100개)"는 진행 중인 실제 이벤트(event_popups, 상시 노출)에
              // 맞춘 문구다 - 해당 프로모션이 종료되면 이 문구도 함께 걷어내야 한다.
              <>
                <strong className="text-brand-600">지역 1호 지점으로 등록하세요</strong> — 6개월 무료(선착순 100개)
              </>,
            ]}
            shortLine={<strong className="text-brand-600">지역 1호 지점을 선점하세요</strong>}
          />
        )}

        {showPlannerNumber ? (
          <div className="rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3">
            <StatChip emoji="👨‍💼" label="등록 설계사" value={stats.publicPlannerProfileCount} unit="명" />
          </div>
        ) : (
          <ReplacementCard
            href="/planner-market/register"
            longLines={[
              '',
              <>
                <strong className="text-brand-600">첫 번째 인증 설계사가 되어보세요</strong>
                <span className="mt-0.5 block text-[11px] font-normal text-ink-faint">원천징수영수증 1장이면 시작됩니다</span>
              </>,
            ]}
            shortLine={<strong className="text-brand-600">첫 번째 인증 설계사가 되어보세요</strong>}
          />
        )}

        {showVisitorNumber ? (
          <div className="rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3">
            <span className="flex items-center gap-1 text-[12px] font-bold text-ink-soft">
              👣 오늘 방문자 <span className="text-brand-600"><StatCountUp value={stats.todayVisitorCount} /></span>명
              {showTodayChip && (
                <>
                  <span className="hidden h-3.5 w-px shrink-0 bg-line sm:block" />
                  🔥 오늘 신규 <span className="text-brand-600"><StatCountUp value={stats.todayCount} /></span>건
                </>
              )}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-center">
            <span className="hidden sm:block">
              <span className="block text-[13px] font-bold text-ink-soft">
                전국 GA <span className="text-brand-600">{stats.gaCount}</span>곳 · <span className="text-brand-600">{stats.regionCount}</span>개 지역을 정리하고 있습니다
              </span>
              <span className="block text-[11px] text-ink-faint">내 지역부터 확인해 보세요</span>
            </span>
            <span className="text-[13px] font-bold text-ink-soft sm:hidden">
              전국 GA {stats.gaCount}곳 · {stats.regionCount}개 지역 정리 중
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
