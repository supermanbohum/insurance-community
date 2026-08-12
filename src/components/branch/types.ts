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
  /** PRO 뱃지 노출 여부(SPEC-035 v2, 0094). 관리자 미리보기(디자인 편집기/지점 편집
   * 워크스페이스)는 실제 PRO 상태를 흉내 낼 이유가 없어 이 필드를 넘기지 않는다 -
   * 그래서 optional이다(미지정 = 미노출). 공개 상세페이지만 실제 값을 넘긴다. */
  isPro?: boolean;
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
  newRecruitTraining: boolean | null;
  experiencedHire: boolean | null;
  dbSupport: boolean | null;
  settlementSupport: boolean | null;
  businessHours: string | null;
  tagline: string | null;
  /**
   * 지점명 오른쪽에 작게 붙는 짧은 소개(0107, 9자 이내, 선택 입력).
   * 🔴 tagline(지점명 아래 한 줄 소개)과 **서로 다른 문구**다 - 같은 말을 자른 것이 아니다.
   * 비어 있으면 그 자리를 그냥 비운다(대체 텍스트·placeholder 금지).
   */
  shortTagline: string | null;
  operationType: 'direct' | 'branch';
  isHeadquarters: boolean;
  updatedAt: string;
  gaCompanyName: string;
  gaCompanyLogoUrl: string | null;
  isGaVerified: boolean;
  media: BranchMediaItem[];
  contacts: BranchContactItem[];
  links: { id: string; type: string; url: string }[];
  insurerNames: string[];
  activeRecruits: BranchRecruitItem[];
  /** 같은 GA 소속의 다른 지점 목록 (자기 자신 제외). GA는 더 이상 자체 상세페이지가 없으므로 여기서 바로 다음 지점으로 이동한다. */
  siblingBranches: SiblingBranchItem[];
  /** 승인+미만료 고소득 설계사 등급별 인원수(배지 노출용, 실명/서류 등 민감정보 없음). */
  plannerBadges: { tier: 'tier_1' | 'tier_2' | 'tier_3'; count: number }[];
}
