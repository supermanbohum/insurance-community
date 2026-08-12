import Link from 'next/link';
import { Megaphone, MessageSquareText, Plus, UserPlus } from 'lucide-react';
import type { HomeStats } from '@/lib/public/branch';
import { StatCountUp } from '@/components/home/StatCountUp';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { GlobalShareButton } from '@/components/shared/GlobalShareButton';
import { cn } from '@/lib/utils';

/**
 * 헤더에 이미 로고+검색창이 있어(BohomMapHeader) 예전 HeroSearch가 그걸 그대로
 * 반복하고 있었다 - 그 자리를 "지점을 등록하고 싶은 사람"과 "설계사로 등록하고
 * 싶은 사람"을 위한 동일 비중의 큰 CTA 2개 + "지금 서비스가 살아있다"는 걸
 * 보여주는 정보 영역으로 바꾼다.
 *
 * TOP설계사 등록 버튼은 메인에서 완전히 제거했다(햄버거 메뉴 "TOP 설계사 · 연봉랭킹"
 * 그룹으로 이동, BohomMapHeader.tsx 참고) - TOP설계사는 오너 지시(2026-08-09)로
 * 설계사마켓과 완전히 별개 스키마로 분리됐고, 이 설계사 등록(리크루팅) 시스템과는
 * 절대 혼용하지 않는다.
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
 * 렌더링해두고 뷰포트 폭으로 전환한다(별도 클라이언트 JS 없이 반응형 처리).
 * href가 없으면 클릭할 수 없는 정보성 카드로 렌더링한다 - 설계사 통계 카드가
 * 이 경우다(③ 완료 전까지는 홈에서 설계사마켓으로 보낼 유효한 링크가 없다,
 * 오너 지시: 홈→마켓 경로 전부 제거, 마켓은 햄버거 메뉴에서만). */
function ReplacementCard({
  href,
  longLines,
  shortLine,
}: {
  href?: string;
  longLines: [string, React.ReactNode];
  shortLine: React.ReactNode;
}) {
  const baseClassName = 'flex flex-col gap-0.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-3 py-2 text-center';
  const content = (
    <>
      <span className="hidden sm:block">
        <span className="block text-[11px] text-ink-faint">{longLines[0]}</span>
        <span className="block text-[13px] font-bold text-ink-soft">{longLines[1]}</span>
      </span>
      <span className="text-[13px] font-bold text-ink-soft sm:hidden">{shortLine}</span>
    </>
  );

  if (!href) {
    return <div className={baseClassName}>{content}</div>;
  }

  return (
    <Link href={href} className={cn(baseClassName, 'transition-colors hover:bg-brand-50')}>
      {content}
    </Link>
  );
}

/** "선착순 100개" 실시간 카운트다운(오너 지시 ⑦, 2026-08-10) - 등록될 때마다
 * 자리가 줄어드는 걸 보여준다. 카운팅 기준은 오너 확정대로 "지점 등록 수" -
 * 별도 프로모션 참여 여부를 추적하는 컬럼이 없으므로(카카오 채널처럼 새 테이블을
 * 만들 정도의 무게는 아니라고 판단) 이미 홈/관리자 대시보드가 공유하는
 * get_platform_core_stats()의 승인 지점 수(stats.branchCount)를 그대로 재사용한다.
 * showBranchNumber가 true로 바뀌는 시점(HOME_STAT_THRESHOLDS.branch=10)에 이
 * 카드 자체가 사라지므로 remaining이 90 아래로 내려가는 걸 실제로 보게 될 일은
 * 없다 - 0 밑으로 내려가지 않게 막아만 둔다(방어적 처리, 정상 동작에선 안 걸림). */
const EARLY_BIRD_TOTAL_SLOTS = 100;

export function HomeRegisterHero({ stats, ctaLabel = '우리 지점 등록하기' }: { stats: HomeStats; ctaLabel?: string }) {
  const showBranchNumber = stats.branchCount >= HOME_STAT_THRESHOLDS.branch;
  const showPlannerNumber = stats.publicPlannerProfileCount >= HOME_STAT_THRESHOLDS.planner;
  const showVisitorNumber = stats.todayVisitorCount >= HOME_STAT_THRESHOLDS.visitor;
  const showTodayChip = stats.todayCount >= STAT_MIN_TODAY_COUNT;
  const earlyBirdSlotsRemaining = Math.max(0, EARLY_BIRD_TOTAL_SLOTS - stats.branchCount);

  return (
    <div className="flex flex-col gap-3">
      {/* 투트랙 CTA(오너 지시, 2026-08-10) - ③ ⓑ 페이지(/branch-planner/register)가
          생겨서 이 자리가 다시 채워졌다. 왼쪽=지점장, 오른쪽=설계사로 역할이 다르다.
          승인 지점이 0개인 지금은 오른쪽을 누르면 대부분 미연결 게이트(BranchPlannerGate)로
          가는데, 그게 설계대로다 - 게이트 자체가 지점 획득 채널로 설계됐다. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HeroCtaButton
          href="/register"
          label={ctaLabel}
          icon={<Plus className="h-6 w-6" strokeWidth={2.5} />}
          gradientClassName="from-brand-500 via-brand-600 to-brand-800"
          glowColor="rgba(37,99,235,0.45)"
        />
        <HeroCtaButton
          href="/branch-planner-register"
          label="우리 지점 설계사 등록하기"
          icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
          gradientClassName="from-brand-500 via-brand-600 to-brand-800"
          glowColor="rgba(37,99,235,0.45)"
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

      <GlobalShareButton variant="home" />

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
              // "6개월 무료(선착순 N개)"는 진행 중인 실제 이벤트(event_popups, 상시 노출)에
              // 맞춘 문구다 - 해당 프로모션이 종료되면 이 문구도 함께 걷어내야 한다. N은
              // 더는 고정 100이 아니라 실시간 잔여 슬롯이다(오너 지시 ⑦).
              <>
                <strong className="text-brand-600">지역 1호 지점으로 등록하세요</strong> — 6개월 무료(선착순{' '}
                <StatCountUp value={earlyBirdSlotsRemaining} />개)
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
            longLines={[
              '지점장님이 설계사님을 찾고 있어요',
              <>
                <strong className="text-brand-600">첫 번째로 등록해보세요</strong> — 완전 무료
              </>,
            ]}
            // 「설계사 등록」만 쓰면 어느 등록인지 안 갈린다 - 이 사이트에는 설계사마켓
            // 등록(/planner-market/register)과 우리 지점 설계사 등록
            // (/branch-planner-register)이 따로 있고, 이 카드가 가리키는 것은 후자다.
            // ⚠️ 위 longLines(넓은 화면용)는 「첫 번째로 등록해보세요」라 같은 모호함이
            // 남아 있다. 그쪽은 문구 자체가 달라 임의로 못 고쳤다 - 콘텐츠 확인 대기.
            shortLine={<strong className="text-brand-600">우리 지점 설계사 등록, 완전 무료</strong>}
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
            {/* 🔴 완료형으로 쓴다. 「정리 중」·「정리하고 있습니다」는 **미완성 신호**라
                심사자에게는 「덜 만든 앱」, 사용자에게는 「아직 쓸 게 없다」로 읽힌다
                (「준비 중」 라벨을 금지한 것과 같은 계열, 콘텐츠 확정 2026-08-12).
                🔴 「지금까지」를 빼지 말 것 - 완료형만 쓰면 「50곳이 전부」로 닫힌다.
                「지금까지」가 계속 늘어난다는 뜻을 담으면서 미완성 신호는 안 준다.
                ⚠️ 상단 배너의 「전국 4,288개 GA」와 숫자가 달라 보이는 문제도 여기서
                갈린다 - 배너는 「받고 있습니다」(대상 범위), 이 줄은 「정리했습니다」
                (우리 작업량)로 동사가 달라야 같은 것의 두 숫자로 안 읽힌다.
                상단 배너는 오너 영역(home_open_banner)이라 건드리지 않는다. */}
            <span className="hidden sm:block">
              <span className="block text-[13px] font-bold text-ink-soft">
                지금까지 GA <span className="text-brand-600">{stats.gaCount}</span>곳 · <span className="text-brand-600">{stats.regionCount}</span>개 지역을 정리했습니다
              </span>
              <span className="block text-[11px] text-ink-faint">내 지역부터 확인해 보세요</span>
            </span>
            <span className="text-[13px] font-bold text-ink-soft sm:hidden">
              지금까지 GA {stats.gaCount}곳 · {stats.regionCount}개 지역을 정리했습니다
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
