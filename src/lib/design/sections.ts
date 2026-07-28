export type Device = 'mobile' | 'tablet' | 'desktop';
export const DEVICES: Device[] = ['mobile', 'tablet', 'desktop'];

export type PageKey = 'home' | 'branch_detail';

export interface TextFieldDef {
  key: string;
  label: string;
  default: string;
}

export interface SectionDef {
  key: string;
  label: string;
  textFields?: TextFieldDef[];
}

export interface SectionConfig {
  key: string;
  order: number;
  visible: boolean;
  locked: boolean;
  marginTop: number;
  marginBottom: number;
  text?: Record<string, string>;
}

/** 홈/지점상세 편집 가능 섹션의 단일 진실 공급원 - 관리자 편집 UI와 공개 페이지
 * 렌더링이 이 배열 하나만 참조한다. 순서는 기본(미저장 상태) 노출 순서이기도 하다. */
export const HOME_SECTIONS: SectionDef[] = [
  {
    key: 'hero',
    label: '등록 CTA + 통계',
    textFields: [{ key: 'ctaLabel', label: 'CTA 버튼 문구', default: '지점 등록하기' }],
  },
  { key: 'quickMenu', label: '빠른 메뉴 (내 주변/지도/지역별/회사별)' },
  { key: 'popularGa', label: '인기 GA' },
  { key: 'latest', label: '신규 등록' },
];

export const BRANCH_DETAIL_SECTIONS: SectionDef[] = [
  { key: 'gallery', label: '대표 이미지/갤러리' },
  { key: 'tagline', label: '한줄소개 배지' },
  { key: 'links', label: 'SNS 링크' },
  { key: 'pillTags', label: '인증/지역 배지' },
  { key: 'actionBar', label: '문의/CTA 버튼' },
  { key: 'map', label: '위치 지도' },
  { key: 'introBlocks', label: '소개글' },
  { key: 'facts', label: '편의시설/정보' },
  { key: 'insurers', label: '취급 원수사' },
  { key: 'recruit', label: '채용' },
  { key: 'reviews', label: '이용후기' },
  { key: 'contacts', label: '연락처' },
  { key: 'siblings', label: '같은 GA 다른 지점' },
];

export function getSectionDefs(pageKey: PageKey): SectionDef[] {
  return pageKey === 'home' ? HOME_SECTIONS : BRANCH_DETAIL_SECTIONS;
}

// 기존 코드의 고정 간격(홈 gap-10=40px, 지점상세 gap-5=20px)과 동일한 기본값 -
// 저장된 설정이 없을 때 지금과 완전히 동일하게 보이도록 한다.
const DEFAULT_MARGIN_BOTTOM: Record<PageKey, number> = { home: 40, branch_detail: 20 };

export function getDefaultConfig(pageKey: PageKey): SectionConfig[] {
  const defs = getSectionDefs(pageKey);
  return defs.map((def, index) => ({
    key: def.key,
    order: index,
    visible: true,
    locked: false,
    marginTop: 0,
    marginBottom: index === defs.length - 1 ? 0 : DEFAULT_MARGIN_BOTTOM[pageKey],
    text: def.textFields
      ? Object.fromEntries(def.textFields.map((f) => [f.key, f.default]))
      : undefined,
  }));
}
