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

/** 홈 통계 표시 임계값(W-031, SPEC-016 ⑧) - "작은 진짜 숫자도 큰 가짜 숫자만큼
 * 해롭다"는 디자인팀 판단에 따라, 지표가 이 값 미만이면 아예 노출하지 않는다.
 * 운영 중 조정할 수 있도록 상수로 분리해뒀다. */
const STAT_MIN_BRANCH_COUNT = 10;
const STAT_MIN_PLANNER_COUNT = 30;
const STAT_MIN_TODAY_COUNT = 1;

/** 생명보험협회·손해보험협회 공시 기준 전국 GA 지점 시장 규모(우리 DB 수치가
 * 아니다) - 표시 가능한 통계가 2개 미만일 때 쓰는 "오픈 배너"용 문구 재료.
 * 우리 데이터가 0이든 1,000이든 항상 참인 문장이라 신뢰도 있는 대체 지표다. */
const MARKET_WIDE_GA_BRANCH_COUNT = 4288;

export function HomeRegisterHero({ stats, ctaLabel = '우리 지점 등록하기' }: { stats: HomeStats; ctaLabel?: string }) {
  const statChips = [
    stats.branchCount >= STAT_MIN_BRANCH_COUNT
      ? { key: 'branch', emoji: '📍', label: '등록 지점', value: stats.branchCount, unit: '개' }
      : null,
    stats.plannerTotal >= STAT_MIN_PLANNER_COUNT
      ? { key: 'planner', emoji: '👨‍💼', label: '등록 설계사', value: stats.plannerTotal, unit: '명' }
      : null,
    stats.todayCount >= STAT_MIN_TODAY_COUNT
      ? { key: 'todayNew', emoji: '🔥', label: '오늘 신규', value: stats.todayCount, unit: '건' }
      : null,
    { key: 'visitor', emoji: '👣', label: '오늘 방문자', value: stats.todayVisitorCount, unit: '명' },
  ].filter((chip): chip is { key: string; emoji: string; label: string; value: number; unit: string } => chip !== null);

  // 표시 가능한 지표가 2개 미만이면 통계 바 대신 "오픈 배너"로 대체한다(SPEC-016 ⑧).
  const showOpenBanner = statChips.length < 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HeroCtaButton
          href="/partner/register"
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

      {showOpenBanner ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-4 text-center">
          <p className="text-[13px] font-bold text-ink-soft">
            전국 <span className="text-brand-600">{MARKET_WIDE_GA_BRANCH_COUNT.toLocaleString()}</span>개 GA의 지점이 지금 등록되고 있습니다
          </p>
          <p className="flex items-center gap-1 text-[12px] font-semibold text-ink-faint">
            👣 오늘 방문자 <span className="text-brand-600"><StatCountUp value={stats.todayVisitorCount} /></span>명
          </p>
          <Link
            href="/partner/register"
            className="mt-1 rounded-full bg-brand-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
          >
            {ctaLabel}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3 sm:flex sm:items-center sm:justify-between">
          {statChips.map((chip, i) => (
            <span key={chip.key} className="contents">
              {i > 0 && <span className="hidden h-3.5 w-px shrink-0 bg-line sm:block" />}
              <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
                {chip.emoji} {chip.label} <span className="text-brand-600"><StatCountUp value={chip.value} /></span>{chip.unit}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
