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

/** 임계값 미만일 때 숫자 대신 보여주는 CTA 카드 - 긴 판(2줄)/짧은 판(1줄)을 둘 다
 * 렌더링해두고 뷰포트 폭으로 전환한다(별도 클라이언트 JS 없이 반응형 처리).
 * href가 없으면 클릭할 수 없는 정보성 카드로 렌더링한다.
 * ⚠️ 2026-08-13부터 두 카드 모두 href가 있다 - 설계사 카드도 /branch-planner-register로
 * 연결됐다. href 없는 분기는 남겨 두지만 지금 그 경로를 타는 호출부는 없다.
 * (옛 메모: ③ 완료 전까지는 홈에서 설계사마켓으로 보낼 유효한 링크가 없었다,
 * 오너 지시: 홈→마켓 경로 전부 제거, 마켓은 햄버거 메뉴에서만). */
function ReplacementCard({
  href,
  longLines,
  shortLine,
}: {
  href?: string;
  longLines: [React.ReactNode, React.ReactNode];
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

/**
 * 「(선착순 N개 지점)」 - 괄호 구간을 통째로 묶는다.
 *
 * 🔴 `whitespace-nowrap`이 없으면 좁은 폭에서 괄호 안이 쪼개진다(디자인 라이브 실측):
 *     375  … (선착순 100 / 개 지점)      숫자만 떨어진다
 *     360  … (선착순 / 100개 지점)       괄호 안이 갈라진다
 *     320  … 무료(선 / 착순 100개 지점)  단어 중간이 잘린다 - 한글은 word-break가 normal이라
 *                                        글자 사이 어디서나 끊긴다
 *
 * ⚠️ 비용이 0이다. 이 문구는 어차피 좁은 폭에서 2줄이라 **줄 수·높이가 같고**
 * (2줄 · 38.5px) 끊기는 자리만 우리가 고르는 것이다. PC(640+)는 어떤 폭에서도 1줄이라
 * nowrap이 있어도 무해하다 - 그래서 두 변형에 같이 건다.
 *
 * `break-keep`(word-break: keep-all)은 안전망이다. 없어도 위 결과가 나오지만, 앞쪽
 * 「6개월 무료」가 단어 중간에서 끊기는 것을 막아 준다.
 */
function EarlyBirdSlots({ remaining }: { remaining: number }) {
  return (
    <span className="whitespace-nowrap break-keep">
      (선착순 <StatCountUp value={remaining} />개 지점)
    </span>
  );
}

export function HomeRegisterHero({ stats, ctaLabel = '우리 지점 등록하기' }: { stats: HomeStats; ctaLabel?: string }) {
  const showBranchNumber = stats.branchCount >= HOME_STAT_THRESHOLDS.branch;
  const showPlannerNumber = stats.publicPlannerProfileCount >= HOME_STAT_THRESHOLDS.planner;
  // 🔴 임계 판정은 **배수 적용 후 값** 기준이다(CTO 확정). 실측 기준으로 재면
  // 화면에 뜨는 숫자와 뜰지 말지를 정하는 숫자가 달라져, 「109가 100 미만이라 안 뜬다」는
  // 설명 불가능한 상태가 된다.
  const displayVisitorCount = toDisplayVisitorCount(stats.todayVisitorCount);
  // 방문자 카운터는 임계 없이 항상 표시한다(위 HOME_STAT_THRESHOLDS 주석 참고).
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
              // 🔴 「지점장님의 지역」이라고 개인화하면 안 된다 - 이 카드가 뜨는 조건은
              // **전국 전체 지점 수**(branchCount < 10)이고 지역을 보지 않는다. 지점이
              // 있는 지역의 지점장에게도 "당신 지역은 비어 있다"고 말하게 된다.
              // 오너가 조건을 바꾸는 대신 문구를 조건에 맞추는 쪽으로 확정했다(2026-08-13).
              //
              // 🔴 정적 문자열로 두지 않는다. 「등록된 지점이 없습니다」를 박아 두면
              // **첫 지점이 승인돼도 사람이 배포할 때까지 화면이 거짓말을 한다.**
              // 아래 「지금까지 GA N곳」 줄이 이미 쓰는 것과 같은 바인딩 방식이다.
              //
              // ⚠️ 아랫줄 「지역 1호 지점을 선점하세요」는 **지역을 보지 않는다.** 전국에
              // N건이 있어도 「지역 1호」라고 말한다. 이번 범위가 아니라 그대로 두지만,
              // 고치려면 지역별 카운트 배선이 필요하고 지금 그 배선이 없다.
              // G1(첫 지점 승인) 시점에 아랫줄까지 함께 판단한다 - 콘텐츠에 대체 후크가
              // 준비돼 있다.
              stats.branchCount === 0 ? (
                '지금까지 등록된 지점이 없습니다'
              ) : (
                <>
                  이미 <span className="text-brand-600">{stats.branchCount}</span>개 지점이 등록됐습니다
                </>
              ),
              // "6개월 무료(선착순 N개)"는 진행 중인 실제 이벤트(event_popups, 상시 노출)에
              // 맞춘 문구다 - 해당 프로모션이 종료되면 이 문구도 함께 걷어내야 한다. N은
              // 더는 고정 100이 아니라 실시간 잔여 슬롯이다(오너 지시 ⑦).
              <>
                <strong className="text-brand-600">지역 1호 지점으로 등록하세요</strong> — 6개월 무료
                <EarlyBirdSlots remaining={earlyBirdSlotsRemaining} />
              </>,
            ]}
            shortLine={
              <>
                <strong className="text-brand-600">지역 1호 지점을 선점하세요</strong> — 6개월 무료
                <EarlyBirdSlots remaining={earlyBirdSlotsRemaining} />
              </>
            }
          />
        )}

        {showPlannerNumber ? (
          <div className="rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3">
            <StatChip emoji="👨‍💼" label="등록 설계사" value={stats.publicPlannerProfileCount} unit="명" />
          </div>
        ) : (
          <ReplacementCard
            // 🔴 링크가 없으면 「등록해보세요」라고 말하는 카드가 안 눌린다. 바로 위
            // 쌍둥이 카드(지점)는 /register로 연결돼 있어 **비대칭이 버그로 읽힌다**
            // (콘텐츠·CTO 상신 → 승인 2026-08-13). 도착지는 이 카드가 가리키는 등록이다.
            href="/branch-planner-register"
            longLines={[
              '지점장님이 설계사님을 찾고 있어요',
              // 「등록해보세요」 단독은 어느 등록인지 안 갈린다 - 이 사이트에는 등록이 셋이다
              // (설계사마켓 / 우리 지점 설계사 / TOP 인증). 이 카드가 가리키는 것은 두 번째다.
              // 🔴 「첫 번째」는 검증 가능한 사실 주장이다. 지금은 등록 설계사 0명이라 참이지만
              // 첫 등록이 생기면 그 지점에서 거짓이 된다. 홈의 「지역 1호 지점을 선점하세요」와
              // 같은 계열이라 **같은 트리거(G1: 첫 지점/설계사 등록)로 함께 교체**한다(콘텐츠 확정).
              <>
                <strong className="text-brand-600">우리 지점 설계사로 첫 번째 등록</strong> — 완전 무료
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

        {/* 🔴 예전에는 이 자리가 「방문자 카운터 **또는** 우리 작업량 줄」이었다.
            visitor 임계가 사라지면서 카운터가 항상 뜨는데, 그렇다고 아래 「지금까지 GA
            N곳 · M개 지역을 정리했습니다」를 버리면 **콘텐츠가 따로 확정한 문구가 조용히
            사라진다**(8/12 확정, 디자인이 재캡처 대기 중이던 줄이다). 둘은 같은 것의
            두 모양이 아니라 서로 다른 정보라, 분기를 풀어 **둘 다 표시**한다. */}
        <div className="rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-white px-4 py-3">
            <span className="flex items-center gap-1 text-[12px] font-bold text-ink-soft">
              👣 오늘 방문자 <span className="text-brand-600"><StatCountUp value={displayVisitorCount} /></span>명
              {showTodayChip && (
                <>
                  <span className="hidden h-3.5 w-px shrink-0 bg-line sm:block" />
                  🔥 오늘 신규 <span className="text-brand-600"><StatCountUp value={stats.todayCount} /></span>건
                </>
              )}
            </span>
        </div>

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
      </div>
    </div>
  );
}
