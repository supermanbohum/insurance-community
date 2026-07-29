import type { PlannerIncomeTier } from '@/types/database';

/** 공개 배지 텍스트 - 실제 연봉 수치가 아닌 등급명만 노출한다(개인정보 보호 정책). */
export const INCOME_TIER_BADGE: Record<PlannerIncomeTier, string> = {
  tier_1: '🥉 Premium 1억+',
  tier_2: '🥈 Premium 2억+',
  tier_3: '🥇 Elite 3억+',
};

export const INCOME_TIER_SHORT_LABEL: Record<PlannerIncomeTier, string> = {
  tier_1: '1억+',
  tier_2: '2억+',
  tier_3: '3억+',
};

export const INCOME_TIER_OPTIONS: { value: PlannerIncomeTier; label: string }[] = [
  { value: 'tier_1', label: '1억원 이상' },
  { value: 'tier_2', label: '2억원 이상' },
  { value: 'tier_3', label: '3억원 이상' },
];

export const TIER_ORDER: PlannerIncomeTier[] = ['tier_3', 'tier_2', 'tier_1'];

/** 만료/갱신 상태는 저장하지 않고 expires_at을 기준으로 매 조회 시점에 계산한다. */
export function derivePlannerDisplayStatus(
  status: 'pending_review' | 'approved' | 'rejected' | 'pending_renewal',
  expiresAt: string | null
): 'pending_review' | 'pending_renewal' | 'rejected' | 'expiring_soon' | 'expired' | 'approved' {
  if (status !== 'approved') return status;
  if (!expiresAt) return 'approved';
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'expiring_soon';
  return 'approved';
}

export const PLANNER_STATUS_LABEL: Record<ReturnType<typeof derivePlannerDisplayStatus>, string> = {
  pending_review: '심사 대기',
  pending_renewal: '재인증 대기',
  rejected: '반려됨',
  expiring_soon: '인증 만료 예정',
  expired: '인증 만료',
  approved: '승인 완료',
};
