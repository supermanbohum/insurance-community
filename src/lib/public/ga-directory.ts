import { listPublicGaCompanies } from './ga.supabase';

export interface GaFilterOption {
  id: string;
  name: string;
  registered: boolean;
}

/**
 * 필터에 항상 노출되는 전국 GA 목록. DB(ga_company)에 아직 등록되지 않은 GA도
 * 검색/지도 필터에서 선택할 수 있어야 한다는 요구사항 때문에 유지하는 참조용 명단이다
 * (업계 상위사 기준, 사용자 제공 예시 포함). DB에 이미 등록된 이름은 실제 행으로 대체된다.
 */
const NATIONWIDE_GA_NAMES = [
  '메리츠금융서비스',
  '한화생명금융서비스',
  '인카금융서비스',
  '지에이코리아',
  '글로벌금융판매',
  '푸본현대생명보험대리점',
  'KB라이프파트너스',
  'DB금융서비스',
  '신한라이프',
  '교보라이프플래닛',
  'AIA생명',
];

const UNREGISTERED_ID_PREFIX = 'unregistered:';

export async function listGaFilterOptions(): Promise<GaFilterOption[]> {
  const registered = await listPublicGaCompanies({});
  const registeredNames = new Set(registered.map((ga) => ga.name));

  const options: GaFilterOption[] = registered.map((ga) => ({ id: ga.id, name: ga.name, registered: true }));

  for (const name of NATIONWIDE_GA_NAMES) {
    if (registeredNames.has(name)) continue;
    options.push({ id: `${UNREGISTERED_ID_PREFIX}${name}`, name, registered: false });
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/**
 * 필터에서 선택된 GA id 중 실제 DB에 등록된 것만 골라 branch 조회에 사용한다.
 * 미등록 GA만 선택된 경우 branch 쿼리를 실행하지 않고 빈 목록으로 처리해야 하므로
 * hasUnregisteredOnly를 함께 반환한다.
 */
export function splitRegisteredGaIds(selectedIds: string[]): {
  registeredIds: string[];
  hasUnregisteredOnly: boolean;
} {
  const registeredIds = selectedIds.filter((id) => !id.startsWith(UNREGISTERED_ID_PREFIX));
  return { registeredIds, hasUnregisteredOnly: selectedIds.length > 0 && registeredIds.length === 0 };
}
