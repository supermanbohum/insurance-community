import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/** 어젯밤 21시(KST) ~ 오늘 08시(KST) - 즉시발송 로직(expo.ts의 isWithinQuietHours)이
 * 정확히 스킵하는 그 구간과 맞물려야 한다. 겹치거나 새는 시간이 있으면 문의가
 * 중복 알림되거나 아예 누락된다. */
function overnightWindow(now = new Date()): { start: Date; end: Date } {
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayKst0800 = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), 8, 0, 0));
  const end = new Date(todayKst0800.getTime() - 9 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 11 * 60 * 60 * 1000); // 08:00 - 11h = 전날 21:00
  return { start, end };
}

export interface OvernightInquiryGroup {
  branchId: string;
  branchName: string;
  gaCompanyId: string;
  count: number;
}

/** 오너 지시(2026-08-08) - 밤에 온 문의는 건별이 아니라 지점별로 묶어서 아침 한 번에
 * 보낸다. 즉시발송 로직이 조용한 시간대엔 아무것도 안 보내고 그냥 넘어가므로(큐잉
 * 안 함), 이 구간의 문의는 전부 "아직 알림 안 간 것"이다 - 별도 발송여부 컬럼 없이도
 * 안전하게 한 번만 잡힌다. */
export async function getOvernightInquiryGroups(): Promise<OvernightInquiryGroup[]> {
  const { start, end } = overnightWindow();
  const admin = createAdminClient();

  const { data: inquiries } = await admin
    .from('branch_inquiries')
    .select('branch_id')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());
  if (!inquiries || inquiries.length === 0) return [];

  const countByBranch = new Map<string, number>();
  for (const row of inquiries) {
    countByBranch.set(row.branch_id, (countByBranch.get(row.branch_id) ?? 0) + 1);
  }

  const branchIds = [...countByBranch.keys()];
  const { data: branches } = await admin.from('ga_branch').select('id, name, ga_company_id').in('id', branchIds);

  return (branches ?? []).map((b) => ({
    branchId: b.id,
    branchName: b.name,
    gaCompanyId: b.ga_company_id,
    count: countByBranch.get(b.id) ?? 0,
  }));
}
