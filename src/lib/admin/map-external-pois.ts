import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * ⑪ 표시 중단 처리용 관리자 조회 - 팝업이 "요청하시면 바로 내려드립니다"라고 약속한
 * 것을 운영팀이 실제로 실행할 수 있게 하는 화면의 데이터 계층이다.
 *
 * 0095~0098이 아직 적용되지 않은 배포에서도 관리자 화면이 500으로 죽지 않도록
 * 조회 실패 시 빈 배열로 폴백한다.
 */
export interface AdminExternalPoi {
  id: string;
  source: string;
  externalId: string;
  name: string;
  address: string | null;
  phone: string | null;
  collectedAt: string;
}

export interface AdminSuppressedPoi {
  source: string;
  externalId: string;
  reason: string | null;
  createdAt: string;
}

export async function listAdminExternalPois(query: string): Promise<AdminExternalPoi[]> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from('map_external_pois')
      .select('id, source, external_id, name, address, phone, collected_at')
      .order('collected_at', { ascending: false })
      .limit(100);
    // 상호/주소로만 찾는다 - 문의는 보통 "○○지점인데 내려주세요"로 들어온다.
    if (query) q = q.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      source: r.source as string,
      externalId: r.external_id as string,
      name: r.name as string,
      address: (r.address as string | null) ?? null,
      phone: (r.phone as string | null) ?? null,
      collectedAt: r.collected_at as string,
    }));
  } catch {
    return [];
  }
}

export async function listSuppressedPois(): Promise<AdminSuppressedPoi[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('map_external_poi_suppressions')
      .select('source, external_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      source: r.source as string,
      externalId: r.external_id as string,
      reason: (r.reason as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}
