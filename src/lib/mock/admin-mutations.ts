import 'server-only';
import { mockStore } from '@/lib/mock/store';
import type { ChangeFieldDiff, ChangeRequestAction, ChangeRequestStatus, ChangeRequestTargetType, MockBranch } from '@/lib/mock/store';
import type { BranchMediaSource, BranchMediaType, GaApprovalStatus, GaDisplayStatus, GaStatus } from '@/types/database';
import type { GaOperationType } from '@/lib/mock/store';
import { diffFields, GA_FIELD_LABELS, GA_FIELD_FORMATTERS, BRANCH_FIELD_LABELS, BRANCH_FIELD_FORMATTERS } from '@/lib/partner/diff';
import { slugify } from '@/lib/utils';

function slugTaken(slug: string): boolean {
  return mockStore.gaCompanies.some((c) => c.slug === slug);
}

function branchSlugTaken(slug: string): boolean {
  return mockStore.branches.some((b) => b.slug === slug);
}

/** 지점명 기반으로 유니크한 slug를 자동 생성한다(충돌 시 -2, -3... 접미사). */
function generateBranchSlug(name: string): string {
  const base = slugify(name) || 'branch';
  let candidate = base;
  let i = 2;
  while (branchSlugTaken(candidate)) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}

/**
 * GA(회사)는 상위 브랜드 정보(회사명/대표자/소개/로고)만 갖는다. 주소·연락처·SNS·교육·복지 등
 * 실제 운영에 관한 필드는 전부 Branch(지점)에만 존재한다.
 */
export interface MockGaCompanyFormInput {
  name: string;
  ceoName?: string;
  description?: string;
  logoPath?: string;
  status?: GaDisplayStatus;
}

export function mockCreateGaCompany(
  input: { slug: string } & MockGaCompanyFormInput
): { id: string } | { error: string } {
  if (slugTaken(input.slug)) return { error: '이미 사용 중인 slug입니다.' };
  const id = mockStore.genId('ga');
  const now = mockStore.nowIso();
  mockStore.gaCompanies.push({
    id,
    slug: input.slug,
    name: input.name,
    ceo_name: input.ceoName ?? null,
    description: input.description ?? null,
    logo_path: input.logoPath ?? null,
    status: input.status ?? 'visible',
    is_verified: false,
    verified_at: null,
    verified_by_admin_id: null,
    approval_status: 'pending',
    approval_reason: null,
    reviewed_by_admin_id: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
    display_priority: 0,
  });
  return { id };
}

/**
 * 부분 업데이트 - GA 수정 화면은 탭(기본정보/노출설정)마다 독립적으로 저장하므로,
 * input에 실제로 포함된 키만 반영하고 나머지 필드는 건드리지 않는다(diffFields의
 * "next에 없는 키는 비교 대상 아님" 철학과 동일 - 한 탭 저장이 다른 탭 값을 지우면 안 된다).
 */
export function mockUpdateGaCompany(id: string, input: Partial<MockGaCompanyFormInput> & { name?: string }): void {
  const company = mockStore.gaCompanies.find((c) => c.id === id);
  if (!company) throw new Error('GA_COMPANY_NOT_FOUND');
  if (input.name !== undefined) company.name = input.name;
  if (input.ceoName !== undefined) company.ceo_name = input.ceoName || null;
  if (input.description !== undefined) company.description = input.description || null;
  if (input.logoPath) company.logo_path = input.logoPath;
  if (input.status !== undefined) company.status = input.status;
  company.updated_at = mockStore.nowIso();
}

export function mockVerifyGaCompany(id: string, verified: boolean, adminId: string): void {
  const company = mockStore.gaCompanies.find((c) => c.id === id);
  if (!company) throw new Error('GA_COMPANY_NOT_FOUND');
  company.is_verified = verified;
  company.verified_at = verified ? mockStore.nowIso() : null;
  company.verified_by_admin_id = verified ? adminId : null;
  company.updated_at = mockStore.nowIso();
}

export function mockSetGaApprovalStatus(id: string, status: GaApprovalStatus, adminId: string, reason?: string): void {
  const company = mockStore.gaCompanies.find((c) => c.id === id);
  if (!company) throw new Error('GA_COMPANY_NOT_FOUND');
  company.approval_status = status;
  company.approval_reason = status === 'rejected' || status === 'suspended' ? reason ?? null : null;
  company.reviewed_by_admin_id = adminId;
  company.reviewed_at = mockStore.nowIso();
  company.updated_at = mockStore.nowIso();
}

export interface MockBranchFormInput {
  name: string;
  regionId: string | null;
  managerName?: string;
  address: string;
  addressDetail?: string;
  lat?: number;
  lng?: number;
  introText?: string;
  educationInfo?: string;
  welfareInfo?: string;
  dbSupportInfo?: string;
  settlementSupportInfo?: string;
  atmosphereInfo?: string;
  plannerCount?: number | null;
  parkingAvailable?: boolean | null;
  visitConsultAvailable?: boolean | null;
  businessHours?: string | null;
  operationType?: GaOperationType;
  isHeadquarters?: boolean;
}

export function mockCreateBranch(gaCompanyId: string, input: MockBranchFormInput): { id: string } {
  const id = mockStore.genId('branch');
  const now = mockStore.nowIso();
  mockStore.branches.push({
    id,
    slug: generateBranchSlug(input.name),
    ga_company_id: gaCompanyId,
    region_id: input.regionId,
    name: input.name,
    manager_name: input.managerName ?? null,
    address: input.address,
    address_detail: input.addressDetail ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    intro_text: input.introText ?? null,
    education_info: input.educationInfo ?? null,
    welfare_info: input.welfareInfo ?? null,
    db_support_info: input.dbSupportInfo ?? null,
    settlement_support_info: input.settlementSupportInfo ?? null,
    atmosphere_info: input.atmosphereInfo ?? null,
    planner_count: input.plannerCount ?? null,
    parking_available: input.parkingAvailable ?? null,
    visit_consult_available: input.visitConsultAvailable ?? null,
    business_hours: input.businessHours ?? null,
    operation_type: input.operationType ?? 'branch',
    is_headquarters: input.isHeadquarters ?? true,
    organic_view_count: 0,
    imported_view_count: 0,
    correction_view_count: 0,
    is_recommended: false,
    recommended_rank: null,
    status: 'visible',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    display_priority: 0,
  });
  return { id };
}

/**
 * 승인 전(공개 전) GA/지점의 직접 수정, 또는 관리자 수정에 쓰인다.
 * 승인 후 파트너 수정은 이 함수를 거치지 않고 mockSubmitBranchChange의 변경요청 경로를 탄다.
 */
export function mockUpdateBranch(branchId: string, input: MockBranchFormInput): void {
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error('BRANCH_NOT_FOUND');
  branch.name = input.name;
  branch.region_id = input.regionId;
  if (input.managerName !== undefined) branch.manager_name = input.managerName || null;
  branch.address = input.address;
  branch.address_detail = input.addressDetail ?? null;
  branch.lat = input.lat ?? null;
  branch.lng = input.lng ?? null;
  branch.intro_text = input.introText ?? null;
  branch.education_info = input.educationInfo ?? null;
  branch.welfare_info = input.welfareInfo ?? null;
  branch.db_support_info = input.dbSupportInfo ?? null;
  branch.settlement_support_info = input.settlementSupportInfo ?? null;
  if (input.atmosphereInfo !== undefined) branch.atmosphere_info = input.atmosphereInfo || null;
  if (input.plannerCount !== undefined) branch.planner_count = input.plannerCount;
  if (input.parkingAvailable !== undefined) branch.parking_available = input.parkingAvailable;
  if (input.visitConsultAvailable !== undefined) branch.visit_consult_available = input.visitConsultAvailable;
  if (input.businessHours !== undefined) branch.business_hours = input.businessHours;
  if (input.operationType !== undefined) branch.operation_type = input.operationType;
  if (input.isHeadquarters !== undefined) branch.is_headquarters = input.isHeadquarters;
  branch.updated_at = mockStore.nowIso();
}

export function mockSetBranchStatus(branchId: string, status: GaStatus): void {
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error('BRANCH_NOT_FOUND');
  branch.status = status;
  if (status === 'deleted') branch.deleted_at = mockStore.nowIso();
  branch.updated_at = mockStore.nowIso();
}

export function mockSetBranchRecommended(branchId: string, isRecommended: boolean): void {
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error('BRANCH_NOT_FOUND');
  branch.is_recommended = isRecommended;
  branch.updated_at = mockStore.nowIso();
}

export function mockSetBranchInsurers(branchId: string, insurerIds: string[]): void {
  mockStore.branchInsurers = mockStore.branchInsurers.filter((bi) => bi.branch_id !== branchId);
  for (const insurerId of insurerIds) {
    mockStore.branchInsurers.push({ branch_id: branchId, insurer_id: insurerId });
  }
}

export function mockUpsertBranchContact(input: {
  contactId: string | null;
  branchId: string;
  type: string;
  value: string;
  label?: string;
  sortOrder?: number;
}): { id: string } {
  const now = mockStore.nowIso();
  if (input.contactId) {
    const contact = mockStore.branchContacts.find((c) => c.id === input.contactId);
    if (!contact) throw new Error('CONTACT_NOT_FOUND');
    contact.type = input.type;
    contact.value = input.value;
    contact.label = input.label ?? null;
    contact.updated_at = now;
    return { id: contact.id };
  }
  const id = mockStore.genId('contact');
  mockStore.branchContacts.push({
    id,
    branch_id: input.branchId,
    type: input.type,
    value: input.value,
    label: input.label ?? null,
    sort_order: input.sortOrder ?? 0,
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export function mockDeleteBranchContact(contactId: string): void {
  mockStore.branchContacts = mockStore.branchContacts.filter((c) => c.id !== contactId);
}

export function mockCreateBranchRecruit(input: {
  branchId: string;
  title: string;
  content: string;
  employmentType?: string;
  endAt?: string;
}): { id: string } {
  const id = mockStore.genId('recruit');
  const now = mockStore.nowIso();
  mockStore.branchRecruits.push({
    id,
    branch_id: input.branchId,
    title: input.title,
    content: input.content,
    employment_type: input.employmentType ?? null,
    is_active: true,
    start_at: now,
    end_at: input.endAt ?? null,
    created_at: now,
    updated_at: now,
  });
  return { id };
}

export function mockCloseBranchRecruit(recruitId: string): void {
  const recruit = mockStore.branchRecruits.find((r) => r.id === recruitId);
  if (!recruit) throw new Error('RECRUIT_NOT_FOUND');
  recruit.is_active = false;
  recruit.updated_at = mockStore.nowIso();
}

export function mockAddBranchMedia(
  branchId: string,
  mediaType: BranchMediaType,
  source: BranchMediaSource,
  value: string
): { id: string } {
  const id = mockStore.genId('media');
  mockStore.branchMedia.push({
    id,
    branch_id: branchId,
    media_type: mediaType,
    source,
    value,
    sort_order: 0,
    created_at: mockStore.nowIso(),
  });
  return { id };
}

export function mockDeleteBranchMedia(mediaId: string): string | null {
  const media = mockStore.branchMedia.find((m) => m.id === mediaId);
  if (!media) return null;
  mockStore.branchMedia = mockStore.branchMedia.filter((m) => m.id !== mediaId);
  return media.value;
}

// ---------------------------------------------------------------
// 파트너(GA 운영자) 변경 요청 - 승인 전에는 즉시 반영, 승인(공개) 후에는 변경요청으로 대기
// ---------------------------------------------------------------

export type ChangeSubmitResult = { status: 'applied' } | { status: 'no_change' } | { status: 'pending'; changeRequestId: string };

function findPendingChangeRequest(targetType: ChangeRequestTargetType, targetId: string) {
  return mockStore.changeRequests.find((r) => r.status === 'pending' && r.target_type === targetType && r.target_id === targetId);
}

/**
 * 동일 대상(같은 GA 또는 같은 지점)에 이미 대기 중인 변경요청이 있으면 새로 만들지 않고
 * 그 요청을 라이브 값 기준으로 재계산한 diff로 덮어쓴다 - "32→40 대기중인데 다시 45로 수정"
 * 같은 상황에서 별도 요청 두 개가 쌓이는 걸 막는다.
 */
function upsertPendingChangeRequest(params: {
  targetType: ChangeRequestTargetType;
  targetId: string;
  gaCompanyId: string;
  submittedByGaAdminId: string;
  action: ChangeRequestAction;
  diffs: ChangeFieldDiff[];
  raw: Record<string, unknown>;
}): { changeRequestId: string } {
  const existing = findPendingChangeRequest(params.targetType, params.targetId);
  if (existing) {
    existing.field_changes = params.diffs;
    existing.raw_new_values = params.raw;
    existing.created_at = mockStore.nowIso();
    return { changeRequestId: existing.id };
  }

  const id = mockStore.genId('change');
  mockStore.changeRequests.push({
    id,
    target_type: params.targetType,
    target_id: params.targetId,
    ga_company_id: params.gaCompanyId,
    action: params.action,
    submitted_by_ga_admin_id: params.submittedByGaAdminId,
    status: 'pending',
    review_reason: null,
    reviewed_by_admin_id: null,
    reviewed_at: null,
    field_changes: params.diffs,
    raw_new_values: params.raw,
    created_at: mockStore.nowIso(),
  });
  return { changeRequestId: id };
}

/** diff가 없어졌는데(원래 값으로 되돌림) 대기 중인 요청이 남아있다면 정리한다. */
function clearPendingChangeRequestIfAny(targetType: ChangeRequestTargetType, targetId: string): void {
  const existing = findPendingChangeRequest(targetType, targetId);
  if (existing) {
    mockStore.changeRequests = mockStore.changeRequests.filter((r) => r.id !== existing.id);
  }
}

export function mockSubmitGaCompanyChange(
  gaCompanyId: string,
  submittedByGaAdminId: string,
  input: MockGaCompanyFormInput
): ChangeSubmitResult {
  const company = mockStore.gaCompanies.find((c) => c.id === gaCompanyId);
  if (!company) throw new Error('GA_COMPANY_NOT_FOUND');

  const next: Record<string, unknown> = {};
  if (input.name !== undefined) next.name = input.name;
  if (input.ceoName !== undefined) next.ceo_name = input.ceoName || null;
  if (input.description !== undefined) next.description = input.description || null;
  if (input.logoPath !== undefined) next.logo_path = input.logoPath || null;
  if (input.status !== undefined) next.status = input.status;

  if (company.approval_status !== 'approved') {
    Object.assign(company, next, { updated_at: mockStore.nowIso() });
    return { status: 'applied' };
  }

  const diffs = diffFields(GA_FIELD_LABELS, company as unknown as Record<string, unknown>, next, GA_FIELD_FORMATTERS);
  if (diffs.length === 0) {
    clearPendingChangeRequestIfAny('ga_company', gaCompanyId);
    return { status: 'no_change' };
  }

  const { changeRequestId } = upsertPendingChangeRequest({
    targetType: 'ga_company',
    targetId: gaCompanyId,
    gaCompanyId,
    submittedByGaAdminId,
    action: 'update',
    diffs,
    raw: next,
  });
  return { status: 'pending', changeRequestId };
}

export interface BranchInsurersChange {
  insurerIds: string[];
}
export interface BranchMainImageChange {
  source: BranchMediaSource;
  value: string;
}
export interface BranchRecruitChange {
  action: 'open' | 'close';
  title?: string;
  content?: string;
  employmentType?: string;
}
export interface BranchContactsChange {
  phone?: string;
  kakao?: string;
  homepage?: string;
}

export interface MockBranchChangeInput {
  name?: string;
  managerName?: string;
  address?: string;
  addressDetail?: string;
  introText?: string;
  educationInfo?: string;
  welfareInfo?: string;
  dbSupportInfo?: string;
  settlementSupportInfo?: string;
  atmosphereInfo?: string;
  plannerCount?: number | null;
  parkingAvailable?: boolean | null;
  visitConsultAvailable?: boolean | null;
  businessHours?: string | null;
  operationType?: GaOperationType;
  isHeadquarters?: boolean;
  insurers?: BranchInsurersChange;
  mainImage?: BranchMainImageChange;
  recruit?: BranchRecruitChange;
  contacts?: BranchContactsChange;
}

const CONTACT_TYPE_LABEL: Record<'phone' | 'kakao' | 'homepage', string> = {
  phone: '대표전화',
  kakao: '카카오톡',
  homepage: '홈페이지',
};

/** 원수사/대표이미지/채용/연락처처럼 단순 필드 비교로 안 되는 항목의 diff + 적용용 raw 값을 함께 만든다. */
function buildCompositeDiffs(
  branch: MockBranch,
  input: MockBranchChangeInput
): { diffs: ChangeFieldDiff[]; raw: Record<string, unknown> } {
  const diffs: ChangeFieldDiff[] = [];
  const raw: Record<string, unknown> = {};

  if (input.insurers) {
    const currentNames = mockStore.branchInsurers
      .filter((bi) => bi.branch_id === branch.id)
      .map((bi) => mockStore.insurers.find((i) => i.id === bi.insurer_id)?.name)
      .filter((n): n is string => Boolean(n))
      .sort();
    const nextIds = input.insurers.insurerIds;
    const nextNames = nextIds
      .map((id) => mockStore.insurers.find((i) => i.id === id)?.name)
      .filter((n): n is string => Boolean(n))
      .sort();
    const oldStr = currentNames.length ? currentNames.join(', ') : '(없음)';
    const newStr =
      nextIds.length === mockStore.insurers.length ? '전보험사' : nextNames.length ? nextNames.join(', ') : '(없음)';
    if (oldStr !== newStr) {
      diffs.push({ field: 'insurers', label: '취급 원수사', oldValue: oldStr, newValue: newStr });
      raw.insurers = input.insurers;
    }
  }

  if (input.mainImage) {
    const currentMain = mockStore.branchMedia.find((m) => m.branch_id === branch.id && m.media_type === 'image_main');
    diffs.push({
      field: 'main_image',
      label: '대표 이미지',
      oldValue: currentMain?.value ?? '',
      newValue: input.mainImage.value,
      kind: 'image',
    });
    raw.mainImage = input.mainImage;
  }

  if (input.recruit) {
    const hasActive = mockStore.branchRecruits.some((r) => r.branch_id === branch.id && r.is_active);
    const oldStr = hasActive ? '채용중' : '모집 종료';
    const newStr = input.recruit.action === 'open' ? '채용중' : '모집 종료';
    if (oldStr !== newStr) {
      diffs.push({ field: 'recruit_status', label: '채용 상태', oldValue: oldStr, newValue: newStr });
      raw.recruit = input.recruit;
    }
  }

  if (input.contacts) {
    const changedContacts: BranchContactsChange = {};
    for (const type of ['phone', 'kakao', 'homepage'] as const) {
      const value = input.contacts[type];
      if (value === undefined) continue;
      const existing = mockStore.branchContacts.find((c) => c.branch_id === branch.id && c.type === type);
      const oldStr = existing?.value || '(없음)';
      const newStr = value || '(없음)';
      if (oldStr !== newStr) {
        diffs.push({ field: `contact_${type}`, label: CONTACT_TYPE_LABEL[type], oldValue: oldStr, newValue: newStr });
        changedContacts[type] = value;
      }
    }
    if (Object.keys(changedContacts).length > 0) raw.contacts = changedContacts;
  }

  return { diffs, raw };
}

/** raw_new_values를 지점 엔티티에 실제로 적용한다. 즉시반영 경로와 변경요청 승인 경로가 공유한다. */
function applyBranchChangeValues(branch: MockBranch, raw: Record<string, unknown>): void {
  const { insurers, mainImage, recruit, contacts, ...scalarFields } = raw as {
    insurers?: BranchInsurersChange;
    mainImage?: BranchMainImageChange;
    recruit?: BranchRecruitChange;
    contacts?: BranchContactsChange;
    [key: string]: unknown;
  };

  if (Object.keys(scalarFields).length > 0) {
    Object.assign(branch, scalarFields);
  }
  if (insurers) {
    mockSetBranchInsurers(branch.id, insurers.insurerIds);
  }
  if (mainImage) {
    mockStore.branchMedia = mockStore.branchMedia.filter(
      (m) => !(m.branch_id === branch.id && m.media_type === 'image_main')
    );
    mockAddBranchMedia(branch.id, 'image_main', mainImage.source, mainImage.value);
  }
  if (recruit) {
    if (recruit.action === 'open') {
      mockCreateBranchRecruit({
        branchId: branch.id,
        title: recruit.title || '채용 공고',
        content: recruit.content || '',
        employmentType: recruit.employmentType,
      });
    } else {
      const active = mockStore.branchRecruits.find((r) => r.branch_id === branch.id && r.is_active);
      if (active) mockCloseBranchRecruit(active.id);
    }
  }
  if (contacts) {
    for (const type of ['phone', 'kakao', 'homepage'] as const) {
      const value = contacts[type];
      if (value === undefined) continue;
      const existing = mockStore.branchContacts.find((c) => c.branch_id === branch.id && c.type === type);
      mockUpsertBranchContact({ contactId: existing?.id ?? null, branchId: branch.id, type, value });
    }
  }
  branch.updated_at = mockStore.nowIso();
}

export function mockSubmitBranchChange(
  branchId: string,
  submittedByGaAdminId: string,
  input: MockBranchChangeInput
): ChangeSubmitResult {
  const branch = mockStore.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error('BRANCH_NOT_FOUND');
  const company = mockStore.gaCompanies.find((c) => c.id === branch.ga_company_id);
  if (!company) throw new Error('GA_COMPANY_NOT_FOUND');

  const next: Record<string, unknown> = {};
  if (input.name !== undefined) next.name = input.name;
  if (input.managerName !== undefined) next.manager_name = input.managerName || null;
  if (input.address !== undefined) next.address = input.address;
  if (input.addressDetail !== undefined) next.address_detail = input.addressDetail || null;
  if (input.introText !== undefined) next.intro_text = input.introText || null;
  if (input.educationInfo !== undefined) next.education_info = input.educationInfo || null;
  if (input.welfareInfo !== undefined) next.welfare_info = input.welfareInfo || null;
  if (input.dbSupportInfo !== undefined) next.db_support_info = input.dbSupportInfo || null;
  if (input.settlementSupportInfo !== undefined) next.settlement_support_info = input.settlementSupportInfo || null;
  if (input.atmosphereInfo !== undefined) next.atmosphere_info = input.atmosphereInfo || null;
  if (input.plannerCount !== undefined) next.planner_count = input.plannerCount;
  if (input.parkingAvailable !== undefined) next.parking_available = input.parkingAvailable;
  if (input.visitConsultAvailable !== undefined) next.visit_consult_available = input.visitConsultAvailable;
  if (input.businessHours !== undefined) next.business_hours = input.businessHours || null;
  if (input.operationType !== undefined) next.operation_type = input.operationType;
  if (input.isHeadquarters !== undefined) next.is_headquarters = input.isHeadquarters;

  const scalarDiffs = diffFields(BRANCH_FIELD_LABELS, branch as unknown as Record<string, unknown>, next, BRANCH_FIELD_FORMATTERS);
  const { diffs: compositeDiffs, raw: compositeRaw } = buildCompositeDiffs(branch, input);
  const diffs = [...scalarDiffs, ...compositeDiffs];
  const raw = { ...next, ...compositeRaw };

  if (company.approval_status !== 'approved') {
    applyBranchChangeValues(branch, raw);
    return { status: 'applied' };
  }

  if (diffs.length === 0) {
    clearPendingChangeRequestIfAny('ga_branch', branchId);
    return { status: 'no_change' };
  }

  const { changeRequestId } = upsertPendingChangeRequest({
    targetType: 'ga_branch',
    targetId: branchId,
    gaCompanyId: company.id,
    submittedByGaAdminId,
    action: 'update',
    diffs,
    raw,
  });
  return { status: 'pending', changeRequestId };
}

/** 승인된 GA가 신규 지점을 추가할 때: 비공개(hidden) 상태로 만들고 생성 자체를 변경요청으로 대기시킨다. */
export function mockCreateBranchDraft(
  gaCompanyId: string,
  submittedByGaAdminId: string,
  input: MockBranchFormInput
): { id: string; changeRequestId: string } {
  const id = mockStore.genId('branch');
  const now = mockStore.nowIso();
  mockStore.branches.push({
    id,
    slug: generateBranchSlug(input.name),
    ga_company_id: gaCompanyId,
    region_id: input.regionId,
    name: input.name,
    manager_name: input.managerName ?? null,
    address: input.address,
    address_detail: input.addressDetail ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    intro_text: input.introText ?? null,
    education_info: input.educationInfo ?? null,
    welfare_info: input.welfareInfo ?? null,
    db_support_info: input.dbSupportInfo ?? null,
    settlement_support_info: input.settlementSupportInfo ?? null,
    atmosphere_info: input.atmosphereInfo ?? null,
    planner_count: input.plannerCount ?? null,
    parking_available: input.parkingAvailable ?? null,
    visit_consult_available: input.visitConsultAvailable ?? null,
    business_hours: input.businessHours ?? null,
    operation_type: input.operationType ?? 'branch',
    is_headquarters: input.isHeadquarters ?? false,
    organic_view_count: 0,
    imported_view_count: 0,
    correction_view_count: 0,
    is_recommended: false,
    recommended_rank: null,
    status: 'hidden',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    display_priority: 0,
  });

  const changeRequestId = mockStore.genId('change');
  mockStore.changeRequests.push({
    id: changeRequestId,
    target_type: 'ga_branch',
    target_id: id,
    ga_company_id: gaCompanyId,
    action: 'create',
    submitted_by_ga_admin_id: submittedByGaAdminId,
    status: 'pending',
    review_reason: null,
    reviewed_by_admin_id: null,
    reviewed_at: null,
    field_changes: [{ field: '_create', label: '신규 지점 등록', oldValue: '-', newValue: input.name }],
    raw_new_values: { status: 'visible' },
    created_at: now,
  });

  return { id, changeRequestId };
}

/** 슈퍼관리자의 변경요청 검토. 승인 시 raw_new_values를 대상 엔티티에 그대로 반영한다. */
export function mockReviewChangeRequest(
  requestId: string,
  reviewedByAdminId: string,
  decision: Exclude<ChangeRequestStatus, 'pending'>,
  reason?: string
): void {
  const request = mockStore.changeRequests.find((r) => r.id === requestId);
  if (!request) throw new Error('CHANGE_REQUEST_NOT_FOUND');
  if (request.status !== 'pending') throw new Error('CHANGE_REQUEST_ALREADY_REVIEWED');

  if (decision === 'approved') {
    if (request.target_type === 'ga_company') {
      const company = mockStore.gaCompanies.find((c) => c.id === request.target_id);
      if (!company) throw new Error('CHANGE_TARGET_NOT_FOUND');
      Object.assign(company, request.raw_new_values, { updated_at: mockStore.nowIso() });
    } else {
      const branch = mockStore.branches.find((b) => b.id === request.target_id);
      if (!branch) throw new Error('CHANGE_TARGET_NOT_FOUND');
      applyBranchChangeValues(branch, request.raw_new_values);
    }
  }

  request.status = decision;
  request.review_reason = decision === 'rejected' || decision === 'changes_requested' ? reason ?? null : null;
  request.reviewed_by_admin_id = reviewedByAdminId;
  request.reviewed_at = mockStore.nowIso();
}

/** 파트너 최초 가입 직후: GA + 첫 지점을 한 번에 등록(pending)하고 파트너 계정을 이 GA에 연결한다. */
export function mockRegisterGaForPartner(
  gaAdminId: string,
  input: { slug: string; name: string; ceoName?: string; description?: string; logoPath?: string; branch: MockBranchFormInput }
): { gaCompanyId: string; branchId: string } | { error: string } {
  const admin = mockStore.gaAdminUsers.find((g) => g.id === gaAdminId);
  if (!admin) throw new Error('GA_ADMIN_NOT_FOUND');
  if (admin.ga_company_id) return { error: '이미 등록된 GA가 있습니다.' };

  const created = mockCreateGaCompany({
    slug: input.slug,
    name: input.name,
    ceoName: input.ceoName,
    description: input.description,
    logoPath: input.logoPath,
  });
  if ('error' in created) return created;

  const branch = mockCreateBranch(created.id, { ...input.branch, isHeadquarters: input.branch.isHeadquarters ?? true });

  admin.ga_company_id = created.id;
  admin.updated_at = mockStore.nowIso();

  return { gaCompanyId: created.id, branchId: branch.id };
}
