export type StarTier = 'star_1' | 'star_2' | 'star_3' | 'star_4' | 'star_5';

export const STAR_TIER_LABEL: Record<StarTier, string> = {
  star_1: '⭐ 1억',
  star_2: '⭐⭐ 2억',
  star_3: '⭐⭐⭐ 3억',
  star_4: '⭐⭐⭐⭐ 5억',
  star_5: '⭐⭐⭐⭐⭐ 10억',
};

/** 관리자가 별등급을 고를 때 참고하는 최소 연봉 기준(원) - 강제 검증은 아니고 UI 힌트용. */
export const STAR_TIER_INCOME_FLOOR_KRW: Record<StarTier, number> = {
  star_1: 100_000_000,
  star_2: 200_000_000,
  star_3: 300_000_000,
  star_4: 500_000_000,
  star_5: 1_000_000_000,
};

export const STAR_TIER_OPTIONS: StarTier[] = ['star_1', 'star_2', 'star_3', 'star_4', 'star_5'];
