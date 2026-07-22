/**
 * 공개 GA 상세 페이지와 관리자 실시간 미리보기가 공유하는 데이터 모양.
 * branch/types.ts의 BranchPreviewData와 동일한 목적 - 두 호출부가 각자 이 형태로
 * 변환해서 넘기면, 렌더링 컴포넌트(GaDetailView)는 하나만 존재한다.
 */
export interface GaMediaItem {
  id: string;
  type: 'banner' | 'gallery';
  source: 'storage' | 'external';
  url: string;
}

export interface GaBranchListItem {
  id: string;
  name: string;
  address: string;
  sidoName: string | null;
  sigunguName: string | null;
}

export interface GaRecruitItem {
  id: string;
  branchId: string;
  branchName: string;
  title: string;
  content: string;
  employmentType: string | null;
}

export interface GaPreviewData {
  name: string;
  slug: string;
  ceoName: string | null;
  description: string | null;
  logoUrl: string | null;
  banner: GaMediaItem | null;
  gallery: GaMediaItem[];
  address: string | null;
  addressDetail: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  homepageUrl: string | null;
  educationInfo: string | null;
  welfareInfo: string | null;
  strengthsInfo: string | null;
  promoVideoUrl: string | null;
  snsBlogUrl: string | null;
  snsInstagramUrl: string | null;
  snsYoutubeUrl: string | null;
  snsKakaoChannelUrl: string | null;
  snsOpenChatUrl: string | null;
  isHeadquarters: boolean;
  operationType: 'direct' | 'branch';
  isRecruiting: boolean;
  isVerified: boolean;
  branchCount: number;
  branches: GaBranchListItem[];
  activeRecruits: GaRecruitItem[];
  updatedAt: string;
}
