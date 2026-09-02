import Link from 'next/link';
import { Megaphone, MessageSquareText, Plus, UserPlus } from 'lucide-react';
import type { HomeStats } from '@/lib/public/branch';
import type { MyBranchSlotState } from '@/lib/public/my-branch-slot';
import { MyBranchSlot } from '@/components/home/MyBranchSlot';
import { StatCountUp } from '@/components/home/StatCountUp';
import { HeroCtaButton } from '@/components/home/HeroCtaButton';
import { GlobalShareButton } from '@/components/shared/GlobalShareButton';

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
  // 🔴 visitor 임계는 제거했다(오너 확정 2026-08-13). 표시값이 실측 × 2.8이라 **오전
  // 내내 100 미만**이었고, 카운터가 정오쯤에야 나타났다(8/12 환산 실측: 11시 78 →
  // 12시 109). 하루 중 시각에 따라 화면이 두 모양이 되면 스토어 캡처도 불안정해진다.
  // ⚠️ 자정 직후에는 「오늘 방문자 3명」처럼 작은 숫자가 뜬다 - 오너가 그 미리보기를
  // 보고 고른 것이다.
  //
  // 🔴 branch·planner 임계는 성격이 다르다. 그건 「숫자가 사회적 증명이 되는 최소치」이고
  // visitor는 표시 자체를 막는 게이트였다. **같이 없애지 마라** - branch를 없애면
  // 지점 1개에 「등록 지점 1개」가 뜬다.
} as const;

const STAT_MIN_TODAY_COUNT = 1;

/**
 * 🔴 **표시용 배수다. 측정값이 아니다.** 오너 확정(2026-08-12): 홈의 「오늘 방문자」를
 * 실측 × 2.8로 표시한다. CTO가 「부풀린 수치를 보여주는 것」이라고 우려를 올렸고
 * 오너가 알고 결정했다 - 사업 판단이다.
 *
 * ⚠️ `site_visits`는 「익명 프로필 생성 수」이지 사람 수가 아니다. 8/11 미들웨어 수정으로
 * 하루 1,453 → 39로 붕괴했고, 그 붕괴가 이 지표의 정체를 드러냈다.
 *
 * 🔴 **이 값을 통계·보고·스토어·광고에 쓰지 마라. 화면 표시 전용이다.**
 * 🔴 `/admin`의 「오늘 방문자」에는 걸지 않는다 - 거기는 운영 판단에 쓰는 숫자다.
 *    부풀리면 우리가 우리 숫자를 못 믿게 된다.
 * 🔴 DB·집계 함수(`site_visits`, `get_today_site_traffic_stats`)는 건드리지 않는다.
 *    표시 계층에서만 곱한다 - 원본이 오염되면 되돌릴 수 없다.
 */
const HOME_VISITOR_DISPLAY_MULTIPLIER = 2.8;

/**
 * 내림으로 통일한다(CTO 확정) - 과대표시를 줄이는 방향이다.
 * 39 × 2.8 = 109.2 → 109.
 */
function toDisplayVisitorCount(actual: number): number {
  return Math.floor(actual * HOME_VISITOR_DISPLAY_MULTIPLIER);
}

function StatChip({ emoji, label, value, unit }: { emoji: string; label: string; value: number; unit: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-[12px] font-bold text-ink-soft">
      {emoji} {label} <span className="text-brand-600"><StatCountUp value={value} /></span>{unit}
    </span>
  );
}

/* 🔴 여기 있던 ReplacementCard(임계 미달 대체 카드)·EarlyBirdSlots(선착순 카운트다운)·
   EARLY_BIRD_TOTAL_SLOTS는 **오너 지시(2026-08-14, 전체회의 안건 ①)로 삭제**됐다.
   「지역 1호」·「첫 번째 등록」·「선착순 100개」류 후크는 홈에서 아예 안 보여주기로 한
   결정이다(승인 설계사 7명·공개 지점 3개가 생기며 문구가 거짓이 됐고, 오너가 교체 대신
   제거를 택했다). 되살리려면 오너 결정부터 뒤집어야 한다 - 코드만 복원하면 안 된다. */

/**
 * 🔴 2026-08-14 분리(CTO 지시): 예전 `HomeRegisterHero` 하나가 「등록 CTA」와 「통계」를
 * 같이 그렸고 디자인 편집기의 hero 섹션 하나가 둘을 덮었다 - CTA만 숨기거나 통계만
 * 옮길 수 없었다. `HomeRegisterCta`(섹션 heroCta) / `HomeRegisterStats`(섹션 heroStats)로
 * 나눈다. 파일 상단의 임계값·배수 상수는 통계 쪽 전용이다.
 */
export function HomeRegisterCta({ ctaLabel = '우리 지점 등록하기' }: { ctaLabel?: string }) {
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
    </div>
  );
}

export function HomeRegisterStats({
  stats,
  myBranchSlot = { kind: 'none' },
}: {
  stats: HomeStats;
  /** SPEC-042 - 뷰어별 「우리 지점」 상태. 'none'이면 지금까지의 배너가 그대로 나온다. */
  myBranchSlot?: MyBranchSlotState;
}) {
  const showBranchNumber = stats.branchCount >= HOME_STAT_THRESHOLDS.branch;
  const showPlannerNumber = stats.publicPlannerProfileCount >= HOME_STAT_THRESHOLDS.planner;
  // 🔴 임계 판정은 **배수 적용 후 값** 기준이다(CTO 확정). 실측 기준으로 재면
  // 화면에 뜨는 숫자와 뜰지 말지를 정하는 숫자가 달라져, 「109가 100 미만이라 안 뜬다」는
  // 설명 불가능한 상태가 된다.
  const displayVisitorCount = toDisplayVisitorCount(stats.todayVisitorCount);
  // 방문자 카운터는 임계 없이 항상 표시한다(위 HOME_STAT_THRESHOLDS 주석 참고).
  const showTodayChip = stats.todayCount >= STAT_MIN_TODAY_COUNT;

  return (
    <div className="flex flex-col gap-1.5">
        {/* 🔴 SPEC-042 - 내 지점이 있으면 **이 자리를 통째로** 「우리 지점」 카드가 가져간다.
            배너 아래에 따로 붙이지 않는다 - 그러면 이미 등록한 사람에게 등록하라고 계속
            말하게 된다(오너·CTO 확정).

            ⚠️ 판단이 하나 걸려 있다: 지점이 10건을 넘어 「등록 지점 N개」 통계가 뜨는
            시점에도 이 카드가 그 자리를 가져간다. 지점을 가진 사람에게는 **자기 지점으로
            가는 길**이 전체 통계보다 우선이라고 봤다 - 통계만 보이고 갈 데가 없으면
            「내 지점이 어디 있지」가 된다. 다만 지금 지점 0건이라 **어느 쪽으로 짜도 화면이
            같아서 확인할 수 없다.** 디자인·CTO 확인이 필요한 자리로 남긴다. */}
        {/* 🔴 임계 미달 시 뜨던 대체 카드 2장(「지역 1호 지점으로 등록하세요 - 6개월
            무료(선착순 N개)」·「우리 지점 설계사로 첫 번째 등록 - 완전 무료」)은
            **오너 지시(2026-08-14, 전체회의 안건 ① 결정)로 전부 삭제**했다. 아예 안
            나온다. 배경: 승인 설계사 7명·공개 지점 3개가 생기며 「첫 번째」「지역 1호」가
            거짓이 됐고, 오너가 문구 교체가 아니라 **카드 자체 제거**를 택했다.
            임계(10) 미달 구간에서는 이 자리가 그냥 빈다 - 대체 문구를 넣지 않는다.
            임계 이상이면 실제 숫자 통계 칩이 뜬다(이건 삭제 대상이 아니다). */}
        {/* 🔴 오너 확정(2026-08-27): 홈 상단은 **[오늘 방문자] → [지도] → [등록 CTA]** 만 둔다.
            여기 있던 것들을 지운 이유를 남긴다 — 지운 줄을 나중에 「실수로 빠졌나」 하고
            되살리지 않기 위해서다.
              · 「전국 4,288개 GA…」 배너   → home_open_banner(오너 영역)에서 껐다. 코드가 아니라 데이터다
              · 「등록 지점 N개」 칩        → 지점이 15개가 되며 임계(10)를 넘어 이번에 뜨기 시작한 것. 오너가 뺐다
              · 「등록 설계사 N명」 칩       → 같은 계열이라 함께 뺐다
              · 「지금까지 GA N곳 · M개 지역을 정리했습니다」 → 오너가 준 최종 목록에 없다
            🔴 되살리려면 오너 확인을 받아라. 특히 마지막 줄은 콘텐츠팀이 8/12에 확정한 문구다.
            「우리 지점」 카드(MyBranchSlot)는 남긴다 — 이미 지점을 가진 사람에게는
            전체 통계보다 **자기 지점으로 가는 길**이 우선이다. */}
        {myBranchSlot.kind !== 'none' ? <MyBranchSlot state={myBranchSlot} /> : null}

        <div className="mb-2 rounded-xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-3 py-2">
            <span className="flex items-center justify-center gap-1 text-[12px] font-bold text-ink-soft">
              👣 오늘 방문자 <span className="text-brand-600"><StatCountUp value={displayVisitorCount} /></span>명
              {showTodayChip && (
                <>
                  <span className="hidden h-3.5 w-px shrink-0 bg-line sm:block" />
                  🔥 오늘 신규 <span className="text-brand-600"><StatCountUp value={stats.todayCount} /></span>건
                </>
              )}
            </span>
        </div>

    </div>
  );
}
