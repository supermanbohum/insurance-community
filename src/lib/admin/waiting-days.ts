/** 승인 대기열 방치 방지(W-086) - 접수일로부터 며칠 지났는지 계산해 오래 대기한
 * 항목을 관리자가 놓치지 않게 한다. 하루 미만이면 "오늘 접수"로 표시한다. */
export function daysWaiting(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
}

export function waitingLabel(createdAt: string): string {
  const days = daysWaiting(createdAt);
  return days === 0 ? '오늘 접수' : `${days}일째 대기`;
}

/** 3일 이상 대기하면 강조 표시(빨간색) - 임계값은 콘텐츠팀 문의 응대 기준(72시간)과 맞춘다. */
export function isOverdue(createdAt: string): boolean {
  return daysWaiting(createdAt) >= 3;
}
