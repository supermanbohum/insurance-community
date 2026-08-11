export interface MapBranch {
  id: string;
  slug: string;
  name: string;
  gaCompanyName: string;
  isGaVerified: boolean;
  sidoName: string | null;
  sigunguName: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  operationType: 'direct' | 'branch';
  hasActiveRecruit: boolean;
  viewCount: number;
  mainImageUrl: string | null;
  kakaoContactHref: string | null;
  contactClickCount: number;
  tagline: string | null;
  plannerBadgeTotal: number;
  /** PRO 뱃지 노출 여부(SPEC-035 v2, 0094) - 지도 팝업도 스펙이 지정한 노출 위치다. */
  isPro: boolean;
}
