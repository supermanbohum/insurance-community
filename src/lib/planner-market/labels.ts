/** 설계사 마켓 등록폼 - 구직 상태 관련 필드 라벨. "이직 가능 여부"(open_to_move)를
 * 대체한 3개 필드(현재 상태/희망 입사 시기/연락 가능 시간)가 공유하는 정본 라벨.
 * `as const`로 선언해 keyof typeof가 리터럴 유니온 타입이 되도록 한다. */

export const JOB_SEARCH_STATUS_LABEL = {
  actively_looking: '적극 구직중',
  open_to_offers: '좋은 조건이면 검토',
  not_looking: '현재 이직 계획 없음',
} as const;

export const DESIRED_START_TIMING_LABEL = {
  immediate: '즉시 가능',
  within_1_month: '1개월 이내',
  within_3_months: '3개월 이내',
  negotiable: '협의',
} as const;

export const CONTACTABLE_TIME_LABEL = {
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
  weekend: '주말',
  anytime: '상관없음',
} as const;
