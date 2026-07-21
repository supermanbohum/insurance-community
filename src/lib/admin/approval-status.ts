import type { GaApprovalStatus } from '@/types/database';

export const APPROVAL_STATUS_LABEL: Record<GaApprovalStatus, string> = {
  pending: '심사중',
  approved: '노출중',
  rejected: '반려됨',
  suspended: '중지됨',
};

export const APPROVAL_STATUS_BADGE_VARIANT: Record<
  GaApprovalStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  suspended: 'secondary',
};
