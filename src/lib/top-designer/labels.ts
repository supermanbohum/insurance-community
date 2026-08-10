// 5단계(10억 포함)에서 4단계로 축소(오너 지시 2026-08-10 대규모 개편 ②) - star_5는
// 완전히 제거했다. 승인된 TOP 설계사가 아직 없어 기존 데이터 마이그레이션은 불필요했다.
export type StarTier = 'star_1' | 'star_2' | 'star_3' | 'star_4';

export const STAR_TIER_LABEL: Record<StarTier, string> = {
  star_1: '⭐ 1억',
  star_2: '⭐⭐ 2억',
  star_3: '⭐⭐⭐ 3억',
  star_4: '⭐⭐⭐⭐ 5억',
};

/** 관리자가 별등급을 고를 때 참고하는 최소 연봉 기준(원) - 강제 검증은 아니고 UI 힌트용. */
export const STAR_TIER_INCOME_FLOOR_KRW: Record<StarTier, number> = {
  star_1: 100_000_000,
  star_2: 200_000_000,
  star_3: 300_000_000,
  star_4: 500_000_000,
};

export const STAR_TIER_OPTIONS: StarTier[] = ['star_1', 'star_2', 'star_3', 'star_4'];
