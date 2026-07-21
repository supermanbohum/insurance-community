/**
 * 공개 지점 상세 페이지와 관리자 실시간 미리보기가 공유하는 데이터 모양.
 * 두 호출부(공개 페이지의 DB fetch 결과, 관리자 편집 폼의 미저장 상태)가
 * 각자 이 형태로 변환해서 넘기면, 아래 렌더링 컴포넌트는 하나만 존재한다.
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

export interface BranchPreviewData {
  name: string;
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
  plannerCount: number | null;
  parkingAvailable: boolean | null;
  visitConsultAvailable: boolean | null;
  businessHours: string | null;
  updatedAt: string;
  gaCompanyName: string;
  isGaVerified: boolean;
  media: BranchMediaItem[];
  contacts: BranchContactItem[];
  insurerNames: string[];
  activeRecruits: BranchRecruitItem[];
}
