import type { ChangeFieldDiff } from '@/lib/mock/store';

export const GA_FIELD_LABELS: Record<string, string> = {
  name: 'GA명',
  ceo_name: '대표자명',
  description: 'GA 소개',
  logo_path: '로고',
  status: '노출 여부',
};

export const BRANCH_FIELD_LABELS: Record<string, string> = {
  name: '지점명',
  manager_name: '대표자',
  address: '주소',
  address_detail: '상세주소',
  intro_text: '회사소개',
  education_info: '교육 안내',
  welfare_info: '복지 안내',
  db_support_info: 'DB지원 안내',
  settlement_support_info: '정착지원 안내',
  atmosphere_info: '분위기',
  planner_count: '설계사 수',
  parking_available: '주차 가능 여부',
  visit_consult_available: '방문 상담 가능 여부',
  business_hours: '운영시간',
  operation_type: '운영 형태',
  is_headquarters: '본사 여부',
};

type FieldFormatter = (value: unknown) => string;

const BOOLEAN_FORMATTER: FieldFormatter = (value) => {
  if (value === null || value === undefined) return '(없음)';
  return value ? '가능' : '불가능';
};

const PLANNER_COUNT_FORMATTER: FieldFormatter = (value) => {
  if (value === null || value === undefined || value === '') return '(없음)';
  return `${value}명`;
};

const OPERATION_TYPE_FORMATTER: FieldFormatter = (value) => (value === 'direct' ? '직영' : value === 'branch' ? '지사' : '(없음)');
const HEADQUARTERS_FORMATTER: FieldFormatter = (value) => (value ? '본사' : '본사 아님');

export const BRANCH_FIELD_FORMATTERS: Record<string, FieldFormatter> = {
  parking_available: BOOLEAN_FORMATTER,
  visit_consult_available: BOOLEAN_FORMATTER,
  planner_count: PLANNER_COUNT_FORMATTER,
  operation_type: OPERATION_TYPE_FORMATTER,
  is_headquarters: HEADQUARTERS_FORMATTER,
};

export const GA_FIELD_FORMATTERS: Record<string, FieldFormatter> = {
  status: (value) => (value === 'visible' ? '공개' : value === 'hidden' ? '비공개' : '(없음)'),
};

function formatFieldValue(value: unknown, formatter?: FieldFormatter): string {
  if (formatter) return formatter(value);
  if (value === null || value === undefined || value === '') return '(없음)';
  return String(value);
}

/**
 * 라이브 값(current)과 폼 제출값(next)을 필드 단위로 비교해 실제로 바뀐 것만 뽑아낸다.
 * next에 없는 키는 비교 대상이 아니고, labels에 매핑되지 않은 필드는 diff에서 제외한다
 * (id/created_at 같은 내부 필드가 실수로 이력에 섞이는 걸 막기 위함).
 */
export function diffFields<T extends Record<string, unknown>>(
  labels: Record<string, string>,
  current: T,
  next: Partial<T>,
  formatters: Record<string, FieldFormatter> = {}
): ChangeFieldDiff[] {
  const diffs: ChangeFieldDiff[] = [];

  for (const key of Object.keys(next)) {
    const label = labels[key];
    if (!label) continue;

    const oldRaw = current[key] ?? null;
    const newRaw = next[key as keyof T] ?? null;
    if (oldRaw === newRaw) continue;

    diffs.push({
      field: key,
      label,
      oldValue: formatFieldValue(oldRaw, formatters[key]),
      newValue: formatFieldValue(newRaw, formatters[key]),
    });
  }

  return diffs;
}
