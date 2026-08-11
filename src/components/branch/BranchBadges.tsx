import { cn } from '@/lib/utils';

/**
 * 지점 뱃지 - 디자인 SPEC-035 v2(2026-08-10, CTO 릴레이).
 *
 * 🔴 동시 표기 순서는 고정이다: TOP 인증(골드) → 우수 GA(블루 아웃라인) → PRO(블루 솔리드).
 * 근거를 그대로 옮긴다 - "신뢰 근거 순(심사 > 산출 > 결제). PRO가 맨 뒤인 것 자체가
 * '결제는 자격이 아니다'의 표기 규칙". 순서를 바꾸면 규칙이 깨지므로 이 파일의 JSX
 * 나열 순서가 곧 스펙이다.
 *
 * 지금 실제로 배선된 것은 PRO 하나뿐이다(오너가 ⑧을 "뱃지만 만들고 보류"로 축소).
 * TOP 인증·우수 GA는 각각 /top-designer, /ga-ranking에 랭킹으로만 존재하고 아직 지점
 * 카드에 붙지 않는다 - 나중에 붙일 때 아래 주석 자리에 끼워 넣으면 순서가 저절로 지켜진다.
 *
 * 🔴 PRO(#2472EC 솔리드)와 우수 GA(#3B82F6 아웃라인)는 같은 블루 계열이라
 * 1차 구분자가 채움/비채움(솔리드=소유, 아웃라인=산출), 2차가 형태(사각 태그 vs 라운드 칩)다.
 * 둘 중 하나라도 무너뜨리면 "결제한 것"과 "점수로 산출된 것"이 시각적으로 섞인다.
 *
 * 🔴 뱃지는 카드 테두리·배경·정렬에 절대 개입하지 않는다 - 지점명 우측 인라인 표기만이다.
 * 오너 확정 "상위 노출 차별 없음"을 시각 층에서 지키는 장치다(디자인 스펙 명시).
 */

/** #2472EC는 디자인 스펙이 지정한 정확한 값이다. 웹 tailwind의 brand-600(#1a4ce6)과
 * 다르므로 토큰으로 바꿔치기하지 않는다 - 우수 GA(#3B82F6)와의 대비가 이 값 기준으로
 * 설계됐다(웹 브랜드 스케일과의 차이는 CTO/디자인에 별도 보고). */
const PRO_BLUE = '#2472EC';

export type BranchBadgeSize = 'list' | 'detail';

/** 스펙 §크기 - 목록 20px / 상세 24px. "뱃지 간 크기 차등 금지"라 이 두 값을 모든
 * 뱃지가 공유한다(PRO만 더 크거나 작게 두지 않는다). */
const SIZE_CLASS: Record<BranchBadgeSize, string> = {
  list: 'h-5 px-1.5 text-[11px]',
  detail: 'h-6 px-2 text-[13px]',
};

/** PRO 뱃지 - "PRO" 워드마크만. 별·체크·왕관·트로피 등 심볼은 전면 금지다.
 * 디자인 근거: "결제를 자격처럼 보이게 하는 유일한 경로가 심볼 차용이다.
 * 뉘앙스 = '인증된 운영자'의 신뢰 신호, 서열 신호 아님". */
export function ProBadge({ size = 'list', className }: { size?: BranchBadgeSize; className?: string }) {
  return (
    <span
      style={{ backgroundColor: PRO_BLUE }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-extrabold tracking-wide text-white',
        SIZE_CLASS[size],
        className
      )}
    >
      PRO
    </span>
  );
}

/**
 * 지점명 우측에 붙는 뱃지 묶음. 지점명 자체는 줄어들되(truncate) 뱃지는 안 줄어들도록
 * 호출부에서 이름에 min-w-0/truncate를, 이 컴포넌트에 shrink-0을 준다.
 *
 * 스펙의 축약 규칙("공간 부족 시 앞에서 2개 + +n, TOP은 절대 축약 안 됨")은 아직
 * 구현하지 않았다 - 붙을 수 있는 뱃지가 PRO 하나뿐이라 축약이 발생할 수 없다.
 * TOP·우수 GA가 배선되는 시점에 함께 넣어야 한다(그때가 규칙이 처음 의미를 갖는 시점).
 */
export function BranchBadges({ isPro, size = 'list', className }: { isPro: boolean; size?: BranchBadgeSize; className?: string }) {
  if (!isPro) return null;

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      {/* 1. TOP 인증(골드 pill, ⭐) - 미배선 */}
      {/* 2. 우수 GA(#3B82F6 아웃라인 칩) - 미배선 */}
      {/* 3. PRO(#2472EC 솔리드 사각 태그) */}
      <ProBadge size={size} />
    </span>
  );
}
