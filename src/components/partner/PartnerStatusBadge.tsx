import type { GaApprovalStatus } from '@/types/database';

const STATUS_CONFIG: Record<GaApprovalStatus, { emoji: string; label: string }> = {
  pending: { emoji: '🟡', label: '심사중' },
  approved: { emoji: '🟢', label: '승인' },
  rejected: { emoji: '🔴', label: '반려' },
  suspended: { emoji: '⚫', label: '중지' },
};

/** 파트너 화면 어디서나 눈에 띄게 승인 상태를 표시하는 배지. */
export function PartnerStatusBadge({ status }: { status: GaApprovalStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs font-semibold">
      <span aria-hidden>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}
