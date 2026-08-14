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
  /** 미저장 상태의 marginBottom 특례. 없으면 페이지 공통 기본값(DEFAULT_MARGIN_BOTTOM). */
  defaultMarginBottom?: number;
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
  // 🔴 예전에는 { key: 'hero', label: '등록 CTA + 통계' } 하나가 둘을 덮었다(CTO 지시로
  // 분리, 2026-08-14) - CTA만 숨기거나 통계만 옮기는 게 불가능했다. 나머지 섹션은 전부
  // 개별인데 이것만 묶음이었다.
  // ⚠️ 옛 키 'hero'로 저장된 레이아웃은 layout.supabase.ts가 읽기 시점에 두 키로
  // 풀어 준다(고아 방지) - 여기 키를 다시 합치거나 이름을 또 바꾸면 그 매핑도 같이 손봐라.
  {
    key: 'heroCta',
    label: '등록 CTA',
    textFields: [{ key: 'ctaLabel', label: 'CTA 버튼 문구', default: '우리 지점 등록하기' }],
    // 분리 전 hero 내부 간격(gap-3 = 12px)을 미저장 기본값에서 그대로 보존한다 -
    // page_layouts가 비어 있어(2026-08-14 직접 조회) 기본값이 곧 프로덕션 화면이다.
    // 공통 기본값 28을 그대로 두면 분리하는 순간 CTA와 통계 사이가 16px 벌어진다.
    defaultMarginBottom: 12,
  },
  { key: 'heroStats', label: '홈 통계 (우리 지점/방문자/정리 현황)' },
  { key: 'quickMenu', label: '빠른 메뉴 (내 주변/지도/지역별/회사별)' },
  // SPEC-040 광고 지면. 게재 소재가 없으면 지면 자체가 렌더되지 않으므로, 여기서
  // visible=true여도 빈 박스가 생기지는 않는다.
  { key: 'adSlot', label: '광고 지면' },
  { key: 'popularGa', label: '인기 GA' },
  { key: 'latest', label: '신규 등록' },
  { key: 'topDesignerRanking', label: 'TOP 설계사 랭킹' },
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

// 지점상세(branch_detail)는 기존 고정 간격(gap-5=20px) 그대로 유지 - SPEC-036 §3은
// 홈에만 적용되는 스펙이라 branch_detail 기본값은 건드리지 않는다.
// 홈은 SPEC-036 §3(디자인, 2026-08-10) GAP_Y=28px로 갱신 - 저장된 admin 편집값이
// 없을 때만 이 기본값이 쓰이므로(page_layouts에 'home' 행이 없음을 직접 쿼리로 확인),
// 이 상수 변경이 곧 실제 프로덕션 동작 변경이다.
const DEFAULT_MARGIN_BOTTOM: Record<PageKey, number> = { home: 28, branch_detail: 20 };

export function getDefaultConfig(pageKey: PageKey): SectionConfig[] {
  const defs = getSectionDefs(pageKey);
  return defs.map((def, index) => ({
    key: def.key,
    order: index,
    visible: true,
    locked: false,
    marginTop: 0,
    marginBottom:
      index === defs.length - 1 ? 0 : (def.defaultMarginBottom ?? DEFAULT_MARGIN_BOTTOM[pageKey]),
    text: def.textFields
      ? Object.fromEntries(def.textFields.map((f) => [f.key, f.default]))
      : undefined,
  }));
}
