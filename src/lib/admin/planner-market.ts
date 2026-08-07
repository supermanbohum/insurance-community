import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlannerProfileStatus, PlannerBadgeSummary, PlannerBadgeStatus } from '@/types/database';

function regionLabel(region: { sido_name: string; sigungu_name: string | null } | null | undefined): string {
  if (!region) return '';
  return region.sigungu_name ? `${region.sido_name} ${region.sigungu_name}` : region.sido_name;
}

function getPhotoBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/planner-market-profile-photos`;
}

export interface PlannerMarketProfileListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  kakaoId: string | null;
  status: PlannerProfileStatus;
  isHidden: boolean;
  withdrawnAt: string | null;
  activeRegionLabel: string;
  careerYears: number;
  memberNickname: string;
  memberUsername: string | null;
  createdAt: string;
  hasTrustUpdatePending: boolean;
}

async function toProfileListItem(row: {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  kakao_id: string | null;
  status: PlannerProfileStatus;
  is_hidden: boolean;
  withdrawn_at: string | null;
  active_region_id: string;
  career_years: number;
  created_at: string;
  trust_update_status?: 'none' | 'draft' | 'pending';
}): Promise<PlannerMarketProfileListItem> {
  const admin = createAdminClient();
  const [{ data: member }, { data: region }] = await Promise.all([
    admin.from('users').select('nickname, username').eq('id', row.user_id).maybeSingle(),
    admin.from('regions').select('sido_name, sigungu_name').eq('id', row.active_region_id).maybeSingle(),
  ]);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    kakaoId: row.kakao_id,
    status: row.status,
    isHidden: row.is_hidden,
    withdrawnAt: row.withdrawn_at,
    activeRegionLabel: regionLabel(region),
    careerYears: row.career_years,
    memberNickname: member?.nickname ?? '알 수 없음',
    memberUsername: member?.username ?? null,
    createdAt: row.created_at,
    hasTrustUpdatePending: row.trust_update_status === 'pending',
  };
}

export async function listPlannerMarketProfiles(options: { status?: PlannerProfileStatus } = {}): Promise<PlannerMarketProfileListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('planner_profiles').select('*').is('withdrawn_at', null).order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];
  return Promise.all(data.map((row) => toProfileListItem(row)));
}

export async function countPendingPlannerMarketProfiles(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('planner_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review')
    .is('withdrawn_at', null);
  return count ?? 0;
}

export interface PlannerMarketProfileDetail extends PlannerMarketProfileListItem {
  specialties: string[];
  selfIntroduction: string | null;
  currentlyEmployed: boolean;
  jobSearchStatus: 'actively_looking' | 'open_to_offers' | 'not_looking';
  desiredStartTiming: 'immediate' | 'within_1_month' | 'within_3_months' | 'negotiable' | null;
  contactableTimes: string[];
  desiredRegionLabel: string | null;
  desiredGaCompanyName: string | null;
  desiredConditions: string | null;
  /** 승인된 배지만(대기/반려 제외) - 관리자 화면에서도 "지금 실제로 공개 노출 중인 배지"를 그대로 보여준다. */
  badges: PlannerBadgeSummary[];
  /** 상태 무관 전체 배지 - 관리자의 수동 부여/회수 UI(PlannerBadgeManagementCard)에서 사용. */
  allBadges: { id: string; code: string; label: string; icon: string; status: PlannerBadgeStatus }[];
  reviewReason: string | null;
  /** W-064 - 관리자는 심사 플래그와 무관하게 항상 실제 사진을 본다(RLS 우회하는 service
   * role 조회라 photo_flagged로 인한 공개 뷰의 URL 억제가 여기엔 적용되지 않는다 - 판단
   * 자체를 위해 필요한 동작). */
  profilePhotoUrl: string | null;
  photoFlagged: boolean;
  photoFlagReason: string | null;
  consents: {
    contactPaidView: boolean;
    recruitContact: boolean;
    privacyPolicy: boolean;
    thirdPartyShare: boolean;
    withdrawalNotice: boolean;
    agreedAt: string | null;
  };
  /** 활동지역/경력/희망GA 재승인 요청 - 대기중(pending)일 때만 채워진다. */
  trustUpdate: {
    status: 'draft' | 'pending';
    current: { activeRegionLabel: string; careerYears: number; desiredGaCompanyName: string | null };
    proposed: { activeRegionLabel: string; careerYears: number; desiredGaCompanyName: string | null };
  } | null;
}

export async function getPlannerMarketProfileDetail(id: string): Promise<PlannerMarketProfileDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('planner_profiles').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [listItem, { data: desiredRegion }, { data: desiredGa }, { data: badgeRows }] = await Promise.all([
    toProfileListItem(row),
    row.desired_region_id ? admin.from('regions').select('sido_name, sigungu_name').eq('id', row.desired_region_id).maybeSingle() : Promise.resolve({ data: null }),
    row.desired_ga_company_id ? admin.from('ga_company').select('name').eq('id', row.desired_ga_company_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('planner_badges').select('id, badge_type_code, status').eq('planner_profile_id', id),
  ]);

  const badgeCodes = Array.from(new Set((badgeRows ?? []).map((b) => b.badge_type_code)));
  const { data: badgeTypes } =
    badgeCodes.length > 0 ? await admin.from('planner_badge_types').select('code, label, icon, sort_order').in('code', badgeCodes) : { data: [] };
  const typeByCode = new Map((badgeTypes ?? []).map((t) => [t.code, t]));

  const allBadges = (badgeRows ?? [])
    .map((b) => {
      const t = typeByCode.get(b.badge_type_code);
      return { id: b.id, code: b.badge_type_code, label: t?.label ?? b.badge_type_code, icon: t?.icon ?? '', status: b.status, sortOrder: t?.sort_order ?? 0 };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const badges: PlannerBadgeSummary[] = allBadges.filter((b) => b.status === 'approved').map((b) => ({ code: b.code, label: b.label, icon: b.icon }));

  return {
    ...listItem,
    specialties: row.specialties,
    selfIntroduction: row.self_introduction,
    currentlyEmployed: row.currently_employed,
    jobSearchStatus: row.job_search_status,
    desiredStartTiming: row.desired_start_timing,
    contactableTimes: row.contactable_times ?? [],
    desiredRegionLabel: desiredRegion ? regionLabel(desiredRegion) : null,
    desiredGaCompanyName: desiredGa?.name ?? null,
    desiredConditions: row.desired_conditions,
    badges,
    allBadges: allBadges.map(({ id, code, label, icon, status }) => ({ id, code, label, icon, status })),
    reviewReason: row.review_reason,
    profilePhotoUrl: row.profile_photo_path ? `${getPhotoBaseUrl()}/${row.profile_photo_path}` : null,
    photoFlagged: row.photo_flagged,
    photoFlagReason: row.photo_flag_reason,
    consents: {
      contactPaidView: row.consent_contact_paid_view,
      recruitContact: row.consent_recruit_contact,
      privacyPolicy: row.consent_privacy_policy,
      thirdPartyShare: row.consent_third_party_share,
      withdrawalNotice: row.consent_withdrawal_notice,
      agreedAt: row.consent_agreed_at,
    },
    trustUpdate: row.trust_update_status === 'pending' ? await buildTrustUpdateDiff(row) : null,
  };
}

async function buildTrustUpdateDiff(row: {
  active_region_id: string;
  career_years: number;
  desired_ga_company_id: string | null;
  pending_active_region_id: string | null;
  pending_career_years: number | null;
  pending_desired_ga_company_id: string | null;
  trust_update_status: 'none' | 'draft' | 'pending';
}) {
  const admin = createAdminClient();
  const proposedRegionId = row.pending_active_region_id ?? row.active_region_id;
  const proposedCareerYears = row.pending_career_years ?? row.career_years;
  const proposedGaId = row.pending_desired_ga_company_id;

  const [{ data: currentRegion }, { data: proposedRegion }, { data: currentGa }, { data: proposedGa }] = await Promise.all([
    admin.from('regions').select('sido_name, sigungu_name').eq('id', row.active_region_id).maybeSingle(),
    admin.from('regions').select('sido_name, sigungu_name').eq('id', proposedRegionId).maybeSingle(),
    row.desired_ga_company_id
      ? admin.from('ga_company').select('name').eq('id', row.desired_ga_company_id).maybeSingle()
      : Promise.resolve({ data: null }),
    proposedGaId ? admin.from('ga_company').select('name').eq('id', proposedGaId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    status: row.trust_update_status as 'draft' | 'pending',
    current: {
      activeRegionLabel: regionLabel(currentRegion),
      careerYears: row.career_years,
      desiredGaCompanyName: currentGa?.name ?? null,
    },
    proposed: {
      activeRegionLabel: regionLabel(proposedRegion),
      careerYears: proposedCareerYears,
      desiredGaCompanyName: proposedGa?.name ?? null,
    },
  };
}
