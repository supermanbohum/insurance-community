import type { AdProductType } from '@/types/database';

/** 지점 광고 상품 카탈로그 - 향후 상품 추가 시 이 배열에만 항목을 추가하면 된다
 * (DB check 제약(0037)에도 값을 함께 추가해야 실제 구매가 가능해진다).
 * isLive=false인 상품은 결제/승인 인프라는 갖췄지만 실제 노출 로직(배너 슬롯 등)이
 * 아직 없어 파트너 카탈로그에서 "준비중"으로 표시된다 - featured_branch만 현재
 * ga_branch.is_recommended에 실제로 반영된다(sync_branch_ad_exposure, 0037 참고). */
export interface AdProductCatalogItem {
  type: AdProductType;
  label: string;
  description: string;
  priceKrw: number;
  isLive: boolean;
}

export const AD_PRODUCT_CATALOG: AdProductCatalogItem[] = [
  { type: 'featured_branch', label: '추천 지점', description: '검색/지도에서 추천 지점으로 상단 노출됩니다.', priceKrw: 100000, isLive: true },
  { type: 'main_banner', label: '메인 배너', description: '홈 화면 상단 배너에 노출됩니다.', priceKrw: 300000, isLive: false },
  { type: 'region_top_pin', label: '지역 상단 고정', description: '선택 지역 검색 결과 최상단에 고정됩니다.', priceKrw: 150000, isLive: false },
  { type: 'search_top', label: '검색결과 상단', description: '전체 검색 결과 상단에 노출됩니다.', priceKrw: 150000, isLive: false },
  { type: 'new_open_badge', label: '신규 오픈 배지', description: '지점 카드에 신규 오픈 배지가 표시됩니다.', priceKrw: 50000, isLive: true },
  { type: 'top_exposure', label: 'TOP 노출', description: '카테고리 내 최상위 노출 슬롯입니다.', priceKrw: 200000, isLive: false },
  { type: 'event_banner', label: '이벤트 배너', description: '이벤트/프로모션 전용 배너에 노출됩니다.', priceKrw: 100000, isLive: false },
];

export const AD_PRODUCT_LABEL: Record<AdProductType, string> = Object.fromEntries(
  AD_PRODUCT_CATALOG.map((item) => [item.type, item.label])
) as Record<AdProductType, string>;
