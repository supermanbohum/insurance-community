import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlannerProfileStatus, PlannerMarketCertificationStatus, PlannerMarketCertificationTier } from '@/types/database';

function regionLabel(region: { sido_name: string; sigungu_name: string | null } | null | undefined): string {
  if (!region) return '';
  return region.sigungu_name ? `${region.sido_name} ${region.sigungu_name}` : region.sido_name;
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
  openToMove: boolean;
  desiredRegionLabel: string | null;
  desiredGaCompanyName: string | null;
  desiredConditions: string | null;
  insurerNames: string[];
  reviewReason: string | null;
  badgeTier: PlannerMarketCertificationTier | null;
  consents: {
    contactPaidView: boolean;
    recruitContact: boolean;
    privacyPolicy: boolean;
    thirdPartyShare: boolean;
    withdrawalNotice: boolean;
    agreedAt: string | null;
  };
}

export async function getPlannerMarketProfileDetail(id: string): Promise<PlannerMarketProfileDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('planner_profiles').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [listItem, { data: desiredRegion }, { data: desiredGa }, { data: insurerRows }, { data: cert }] = await Promise.all([
    toProfileListItem(row),
    row.desired_region_id ? admin.from('regions').select('sido_name, sigungu_name').eq('id', row.desired_region_id).maybeSingle() : Promise.resolve({ data: null }),
    row.desired_ga_company_id ? admin.from('ga_company').select('name').eq('id', row.desired_ga_company_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('planner_profile_insurers').select('insurer_id').eq('planner_profile_id', id),
    admin
      .from('planner_market_certifications')
      .select('tier')
      .eq('planner_profile_id', id)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const insurerIds = (insurerRows ?? []).map((r) => r.insurer_id);
  const { data: insurers } = insurerIds.length > 0 ? await admin.from('insurers').select('name').in('id', insurerIds) : { data: [] };

  return {
    ...listItem,
    specialties: row.specialties,
    selfIntroduction: row.self_introduction,
    currentlyEmployed: row.currently_employed,
    openToMove: row.open_to_move,
    desiredRegionLabel: desiredRegion ? regionLabel(desiredRegion) : null,
    desiredGaCompanyName: desiredGa?.name ?? null,
    desiredConditions: row.desired_conditions,
    insurerNames: (insurers ?? []).map((i) => i.name),
    reviewReason: row.review_reason,
    badgeTier: cert?.tier ?? null,
    consents: {
      contactPaidView: row.consent_contact_paid_view,
      recruitContact: row.consent_recruit_contact,
      privacyPolicy: row.consent_privacy_policy,
      thirdPartyShare: row.consent_third_party_share,
      withdrawalNotice: row.consent_withdrawal_notice,
      agreedAt: row.consent_agreed_at,
    },
  };
}

export interface PlannerMarketCertificationListItem {
  id: string;
  plannerProfileId: string;
  plannerName: string;
  status: PlannerMarketCertificationStatus;
  createdAt: string;
}

export async function listPlannerMarketCertifications(
  options: { status?: PlannerMarketCertificationStatus } = {}
): Promise<PlannerMarketCertificationListItem[]> {
  const admin = createAdminClient();
  let query = admin.from('planner_market_certifications').select('*').order('created_at', { ascending: false });
  if (options.status) query = query.eq('status', options.status);
  const { data } = await query;
  if (!data) return [];

  const profileIds = Array.from(new Set(data.map((r) => r.planner_profile_id)));
  const { data: profiles } = profileIds.length > 0 ? await admin.from('planner_profiles').select('id, name').in('id', profileIds) : { data: [] };
  const nameByProfileId = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  return data.map((row) => ({
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    plannerName: nameByProfileId.get(row.planner_profile_id) ?? '알 수 없음',
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function countPendingPlannerMarketCertifications(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('planner_market_certifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review');
  return count ?? 0;
}

export interface PlannerMarketCertificationDetail extends PlannerMarketCertificationListItem {
  incomeDocUrl: string | null;
  reviewReason: string | null;
  approvedAt: string | null;
}

export async function getPlannerMarketCertificationDetail(id: string): Promise<PlannerMarketCertificationDetail | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from('planner_market_certifications').select('*').eq('id', id).maybeSingle();
  if (!row) return null;

  const [{ data: profile }, { data: doc }] = await Promise.all([
    admin.from('planner_profiles').select('name').eq('id', row.planner_profile_id).maybeSingle(),
    admin
      .from('verification_documents')
      .select('storage_path')
      .eq('owner_type', 'planner_market_certification')
      .eq('owner_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let incomeDocUrl: string | null = null;
  if (doc?.storage_path) {
    const { data: signed } = await admin.storage.from('planner-market-income-docs').createSignedUrl(doc.storage_path, 600);
    incomeDocUrl = signed?.signedUrl ?? null;
  }

  return {
    id: row.id,
    plannerProfileId: row.planner_profile_id,
    plannerName: profile?.name ?? '알 수 없음',
    status: row.status,
    createdAt: row.created_at,
    incomeDocUrl,
    reviewReason: row.review_reason,
    approvedAt: row.approved_at,
  };
}
