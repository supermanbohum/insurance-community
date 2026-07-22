export interface MapBranch {
  id: string;
  name: string;
  gaCompanyName: string;
  gaCompanySlug: string;
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
}
