/**
 * 공개 지점 상세 페이지와 관리자 실시간 미리보기가 공유하는 데이터 모양.
 * 두 호출부(공개 페이지의 DB fetch 결과, 관리자 편집 폼의 미저장 상태)가
 * 각자 이 형태로 변환해서 넘기면, 아래 렌더링 컴포넌트는 하나만 존재한다.
 * 검색/지도/즐겨찾기/상세페이지가 전부 이 Branch 데이터 하나를 기준으로 동작한다 -
 * GA(회사)는 로고/이름/소개만 갖는 상위 브랜드 정보로 여기 gaCompany 서브 객체에만 나타난다.
 */
export interface BranchMediaItem {
  id: string;
  type: 'image_main' | 'image_office' | 'video';
  source: 'storage' | 'external';
  url: string;
}

export interface BranchContactItem {
  id: string;
  type: string;
  value: string;
  label: string | null;
}

export interface BranchRecruitItem {
  id: string;
  title: string;
  content: string;
  employmentType: string | null;
}

export interface SiblingBranchItem {
  id: string;
  slug: string;
  name: string;
  sidoName: string | null;
  sigunguName: string | null;
}

export interface BranchPreviewData {
  name: string;
  slug: string;
  managerName: string | null;
  address: string;
  addressDetail: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  gaBranchCount: number;
  lat: number | null;
  lng: number | null;
  introText: string | null;
  educationInfo: string | null;
  welfareInfo: string | null;
  dbSupportInfo: string | null;
  settlementSupportInfo: string | null;
  atmosphereInfo: string | null;
  plannerCount: number | null;
  parkingAvailable: boolean | null;
  visitConsultAvailable: boolean | null;
  businessHours: string | null;
  operationType: 'direct' | 'branch';
  isHeadquarters: boolean;
  updatedAt: string;
  gaCompanyName: string;
  gaCompanyLogoUrl: string | null;
  isGaVerified: boolean;
  media: BranchMediaItem[];
  contacts: BranchContactItem[];
  insurerNames: string[];
  activeRecruits: BranchRecruitItem[];
  /** 같은 GA 소속의 다른 지점 목록 (자기 자신 제외). GA는 더 이상 자체 상세페이지가 없으므로 여기서 바로 다음 지점으로 이동한다. */
  siblingBranches: SiblingBranchItem[];
}
