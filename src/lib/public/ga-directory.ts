import { listPublicGaCompanies } from './ga.supabase';

export interface GaFilterOption {
  id: string;
  name: string;
  registered: boolean;
}

const UNREGISTERED_ID_PREFIX = 'unregistered:';

/**
 * GA는 관리자가 관리하는 고정 마스터 데이터다 - 실제 DB(ga_company)에 있는 회사만
 * 선택지로 제공한다. 예전에는 여기에 하드코딩된 "전국 GA 이름" 참고 목록을 섞어
 * 보여줬는데, 그 이름 그대로 지점을 등록하면 register_branch_for_partner가 그
 * 자리에서 새 ga_company를 만들어버려 오타/테스트 이름이 GA 목록에 그대로
 * 남는 문제가 있었다. 지금은 DB에 실제로 존재하는 회사만 보여주고, 등록도
 * 그 회사에 연결만 한다(새로 만들지 않음) - GA Master(고정) → 사용자는 선택만.
 */
export async function listGaFilterOptions(): Promise<GaFilterOption[]> {
  const registered = await listPublicGaCompanies({});
  return registered
    .map((ga) => ({ id: ga.id, name: ga.name, registered: true }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/**
 * 필터에서 선택된 GA id 중 실제 DB에 등록된 것만 골라 branch 조회에 사용한다.
 * GA 목록이 이제 전부 실제 DB 행이라 "미등록"은 나오지 않지만, 검색/지도 필터
 * 호출부와의 시그니처 호환을 위해 그대로 둔다.
 */
export function splitRegisteredGaIds(selectedIds: string[]): {
  registeredIds: string[];
  hasUnregisteredOnly: boolean;
} {
  const registeredIds = selectedIds.filter((id) => !id.startsWith(UNREGISTERED_ID_PREFIX));
  return { registeredIds, hasUnregisteredOnly: selectedIds.length > 0 && registeredIds.length === 0 };
}
