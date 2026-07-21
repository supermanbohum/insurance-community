import type { BranchRow } from '@/lib/admin/branch';

export interface CompletenessInput {
  branch: BranchRow;
  hasMainImage: boolean;
  contactCount: number;
  insurerCount: number;
  hasActiveRecruit: boolean;
}

export interface CompletenessResult {
  percent: number;
  filledCount: number;
  totalCount: number;
  missingLabels: string[];
}

/** GA(지점) 프로필 완성도 - 공개 페이지에서 실제로 노출되는 항목 기준 체크리스트. */
export function computeBranchCompleteness(input: CompletenessInput): CompletenessResult {
  const checks: { label: string; done: boolean }[] = [
    { label: '주소', done: Boolean(input.branch.address?.trim()) },
    { label: '회사소개', done: Boolean(input.branch.intro_text?.trim()) },
    { label: '교육 안내', done: Boolean(input.branch.education_info?.trim()) },
    { label: '복지 안내', done: Boolean(input.branch.welfare_info?.trim()) },
    { label: 'DB지원 안내', done: Boolean(input.branch.db_support_info?.trim()) },
    { label: '정착지원 안내', done: Boolean(input.branch.settlement_support_info?.trim()) },
    { label: '대표사진', done: input.hasMainImage },
    { label: '연락처 1개 이상', done: input.contactCount > 0 },
    { label: '취급 원수사 1개 이상', done: input.insurerCount > 0 },
    { label: '진행중 채용공고', done: input.hasActiveRecruit },
  ];

  const filledCount = checks.filter((c) => c.done).length;
  const totalCount = checks.length;

  return {
    percent: Math.round((filledCount / totalCount) * 100),
    filledCount,
    totalCount,
    missingLabels: checks.filter((c) => !c.done).map((c) => c.label),
  };
}
