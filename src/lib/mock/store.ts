import 'server-only';
import { randomUUID } from 'crypto';
import type { AuthProviderType, GaApprovalStatus, GaStatus } from '@/types/database';

/**
 * 인메모리 Mock "DB". 서버 프로세스가 살아있는 동안만 유지된다(재시작하면 초기화).
 * 실제 Supabase 스키마(0006~0010)의 테이블 구조를 최대한 그대로 흉내내서,
 * DB가 준비됐을 때 lib/public/*.supabase.ts / lib/admin/*.supabase.ts로
 * 교체하기만 하면 되도록 필드명을 맞췄다.
 */

export interface MockRegion {
  id: string;
  sido_code: string;
  sido_name: string;
  sigungu_code: string | null;
  sigungu_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface MockInsurer {
  id: string;
  name: string;
  logo_path: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type GaOperationType = 'direct' | 'branch';
/** GA(본사) 노출 상태 - approval_status(심사)와 별개로, 승인된 이후에도 관리자가 임시로 내릴 수 있는 스위치. */
export type GaDisplayStatus = 'visible' | 'hidden' | 'deleted';

/**
 * GA는 상위 브랜드 정보(로고/회사명/대표자/소개)만 갖는다. 주소·연락처·SNS·교육·복지 등
 * 실제 운영에 관한 필드는 전부 Branch(지점)로 이관됐다 - 지점마다 운영 방식·교육·복지·
 * 채용·분위기가 다르기 때문에 사용자가 실제로 찾고 비교하는 단위는 GA가 아니라 Branch다.
 */
export interface MockGaCompany {
  id: string;
  slug: string;
  name: string;
  ceo_name: string | null;
  description: string | null;
  logo_path: string | null;
  /** 승인(approval_status='approved') 이후에도 관리자가 임시로 노출을 껐다 켤 수 있는 스위치. */
  status: GaDisplayStatus;
  is_verified: boolean;
  verified_at: string | null;
  /** 향후 인증 정책이 바뀌어도(예: 등급제, 재인증 만료 등) 누가/언제 부여했는지 추적할 수 있도록 남겨둔다. */
  verified_by_admin_id: string | null;
  approval_status: GaApprovalStatus;
  approval_reason: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Mock 데이터 노출 우선순위. 숫자가 클수록 목록/홈 화면 상단에 먼저 노출된다(실 스키마 개념 아님, mock 전용 큐레이션). */
  display_priority: number;
}

export interface MockBranch {
  id: string;
  /** 공개 상세페이지(/branch/[slug]) 라우팅 키. 유니크. */
  slug: string;
  ga_company_id: string;
  region_id: string | null;
  name: string;
  /** 대표자(지점장/본부장). GA의 ceo_name과 별개 - 지점마다 다를 수 있다. */
  manager_name: string | null;
  address: string;
  address_detail: string | null;
  lat: number | null;
  lng: number | null;
  intro_text: string | null;
  education_info: string | null;
  welfare_info: string | null;
  db_support_info: string | null;
  settlement_support_info: string | null;
  /** 분위기 - 지점 고유의 근무 분위기/문화 소개. */
  atmosphere_info: string | null;
  planner_count: number | null;
  parking_available: boolean | null;
  visit_consult_available: boolean | null;
  business_hours: string | null;
  /** 지점 운영 형태 - 'direct'(직영) | 'branch'(지사). GA가 아니라 지점마다 다를 수 있다. */
  operation_type: GaOperationType;
  /** 이 지점이 소속 GA의 본사(headquarters)인지 여부. GA당 최대 1개 지점만 true. */
  is_headquarters: boolean;
  organic_view_count: number;
  imported_view_count: number;
  correction_view_count: number;
  is_recommended: boolean;
  recommended_rank: number | null;
  status: GaStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Mock 데이터 노출 우선순위. 숫자가 클수록 목록/홈 화면 상단에 먼저 노출된다(실 스키마 개념 아님, mock 전용 큐레이션). */
  display_priority: number;
}

/** GA 운영자(파트너) 계정. admin_users(플랫폼 최고관리자)와 완전 분리된 별도 역할. */
export interface MockGaAdminUser {
  id: string;
  ga_company_id: string | null; // 아직 GA 등록 전(가입 직후)이면 null
  branch_id: string | null; // null이면 소속 GA의 모든 지점 관리, 특정 값이면 해당 지점만
  email: string;
  /** Mock 전용 평문 비밀번호. 실제 배포 시 Supabase Auth로 완전히 교체해야 한다 - 프로덕션에 절대 이 방식 그대로 쓰지 말 것. */
  password: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 플랫폼 최고관리자 계정. 지금은 lib/admin/session.mock.ts의 고정 계정 하나뿐이지만,
 * 변경요청 승인자 이름을 조회하려면 조회 가능한 목록 형태로도 존재해야 한다. */
export interface MockAdminUser {
  id: string;
  display_name: string;
}

/** 일반 회원(비회원과 구분되는 로그인 사용자). admin_users/ga_admin_users와 완전히 분리된 별도 역할. */
export interface MockUser {
  id: string;
  auth_user_id: string;
  email: string | null;
  nickname: string;
  profile_image: string | null;
  provider: AuthProviderType;
  created_at: string;
  updated_at: string;
}

export interface MockFavorite {
  id: string;
  user_id: string;
  branch_id: string;
  created_at: string;
}

/** 향후 확장용 - 이번 스코프에서는 타입만 정의하고 CRUD/UI는 구현하지 않는다. */
export interface MockReview {
  id: string;
  user_id: string;
  branch_id: string;
  rating: number;
  content: string;
  created_at: string;
}

/** 향후 확장용 - 이번 스코프에서는 타입만 정의하고 CRUD/UI는 구현하지 않는다. */
export interface MockRecentView {
  id: string;
  user_id: string;
  branch_id: string;
  viewed_at: string;
}

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ChangeRequestTargetType = 'ga_company' | 'ga_branch';
export type ChangeRequestAction = 'create' | 'update';

export interface ChangeFieldDiff {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  /** 'image'면 oldValue/newValue를 텍스트가 아니라 이미지 URL(빈 문자열이면 이미지 없음)로 취급해 썸네일로 비교 렌더링한다. */
  kind?: 'text' | 'image';
}

/** GA 승인(공개) 이후의 모든 수정 신청과, 최초 등록 신청 이력을 함께 담는 변경 요청 레코드. */
export interface MockChangeRequest {
  id: string;
  target_type: ChangeRequestTargetType;
  target_id: string;
  ga_company_id: string; // 조회/권한 스코프용 비정규화
  action: ChangeRequestAction;
  submitted_by_ga_admin_id: string;
  status: ChangeRequestStatus;
  review_reason: string | null;
  reviewed_by_admin_id: string | null;
  reviewed_at: string | null;
  field_changes: ChangeFieldDiff[];
  /** field_changes는 화면 표시용 포맷 문자열이라, 승인 시 실제로 적용할 원본 타입 값을 별도로 들고 있는다. */
  raw_new_values: Record<string, unknown>;
  created_at: string;
}

export interface MockBranchMedia {
  id: string;
  branch_id: string;
  media_type: 'image_main' | 'image_office' | 'video';
  source: 'storage' | 'external';
  value: string;
  sort_order: number;
  created_at: string;
}

export interface MockBranchContact {
  id: string;
  branch_id: string;
  type: string;
  value: string;
  label: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MockBranchRecruit {
  id: string;
  branch_id: string;
  title: string;
  content: string;
  employment_type: string | null;
  is_active: boolean;
  start_at: string;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------
// regions - 17개 시도 + 시군구 (0009_seed_regions_insurers.sql과 동일 데이터)
// ---------------------------------------------------------------
const SIDO_SIGUNGU: [string, string, string[]][] = [
  ['11', '서울특별시', ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구']],
  ['26', '부산광역시', ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군']],
  ['27', '대구광역시', ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군']],
  ['28', '인천광역시', ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군']],
  ['29', '광주광역시', ['동구','서구','남구','북구','광산구']],
  ['30', '대전광역시', ['동구','중구','서구','유성구','대덕구']],
  ['31', '울산광역시', ['중구','남구','동구','북구','울주군']],
  ['41', '경기도', ['수원시','성남시','의정부시','안양시','부천시','광명시','평택시','동두천시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','연천군','가평군','양평군']],
  ['42', '강원특별자치도', ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군']],
  ['43', '충청북도', ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군']],
  ['44', '충청남도', ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군']],
  ['45', '전북특별자치도', ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군']],
  ['46', '전라남도', ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군']],
  ['47', '경상북도', ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군']],
  ['48', '경상남도', ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군']],
  ['50', '제주특별자치도', ['제주시','서귀포시']],
];

function buildMockStore() {
const now = new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function buildRegions(): MockRegion[] {
  const regions: MockRegion[] = [
    { id: 'region-36', sido_code: '36', sido_name: '세종특별자치시', sigungu_code: null, sigungu_name: null, sort_order: 0, created_at: now },
  ];
  for (const [sidoCode, sidoName, sigunguList] of SIDO_SIGUNGU) {
    sigunguList.forEach((sigunguName, idx) => {
      const sigunguCode = `${sidoCode}-${String(idx + 1).padStart(2, '0')}`;
      regions.push({
        id: `region-${sigunguCode}`,
        sido_code: sidoCode,
        sido_name: sidoName,
        sigungu_code: sigunguCode,
        sigungu_name: sigunguName,
        sort_order: idx,
        created_at: now,
      });
    });
  }
  return regions;
}

const regions: MockRegion[] = buildRegions();

const insurers: MockInsurer[] = [
  '삼성생명', '한화생명', '교보생명', '신한라이프', '미래에셋생명', '동양생명', 'KB라이프생명', 'NH농협생명',
  '흥국생명', 'DB생명', '메트라이프생명', '처브라이프', '라이나생명',
  '삼성화재', '현대해상', 'DB손해보험', 'KB손해보험', '메리츠화재', '한화손해보험', '롯데손해보험', '흥국화재',
  'MG손해보험', 'NH농협손해보험', '캐롯손해보험', 'AXA손해보험',
].map((name, i) => ({ id: `insurer-${i + 1}`, name, logo_path: null, is_active: true, sort_order: i, created_at: now }));

function regionIdBySigunguName(sidoCode: string, sigunguName: string): string {
  const region = regions.find((r) => r.sido_code === sidoCode && r.sigungu_name === sigunguName);
  if (!region) throw new Error(`mock region not found: ${sidoCode} ${sigunguName}`);
  return region.id;
}

const gaCompanies: MockGaCompany[] = [
  {
    id: 'ga-1', slug: 'kb-insure-partners', name: 'KB인슈어런스파트너스',
    ceo_name: '김보험', description: '고객 중심의 종합보험 컨설팅을 지향하는 GA입니다. 전국 12개 지점, 850명의 설계사가 함께합니다.',
    logo_path: null, status: 'visible',
    is_verified: true, verified_at: daysAgo(120), verified_by_admin_id: 'mock-admin-1',
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(150),
    created_at: daysAgo(200), updated_at: daysAgo(10), display_priority: 0,
  },
  {
    id: 'ga-2', slug: 'good-insurance-partners', name: '굿인슈런스파트너스',
    ceo_name: '이대표', description: '신입 설계사 정착 지원과 체계적인 교육 시스템이 강점인 GA입니다.',
    logo_path: null, status: 'visible',
    is_verified: true, verified_at: daysAgo(80), verified_by_admin_id: 'mock-admin-1',
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(90),
    created_at: daysAgo(140), updated_at: daysAgo(5), display_priority: 0,
  },
  {
    id: 'ga-3', slug: 'hanwha-total-insure', name: '한화토탈인슈어런스',
    ceo_name: '박대표', description: null,
    logo_path: null,
    // 승인은 됐지만 관리자가 임시로 노출을 꺼둔 데모 케이스(운영상태 비노출).
    status: 'hidden',
    is_verified: false, verified_at: null, verified_by_admin_id: null,
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: null, reviewed_at: daysAgo(30),
    created_at: daysAgo(60), updated_at: daysAgo(2), display_priority: 0,
  },
  {
    id: 'ga-4', slug: 'first-insure-group', name: '퍼스트인슈어그룹',
    ceo_name: '최대표', description: '이제 막 입점을 신청한 신규 GA입니다.',
    logo_path: null, status: 'visible',
    is_verified: false, verified_at: null, verified_by_admin_id: null,
    approval_status: 'pending', approval_reason: null, reviewed_by_admin_id: null, reviewed_at: null,
    created_at: daysAgo(1), updated_at: daysAgo(1), display_priority: 0,
  },
  {
    id: 'ga-5', slug: 'suspended-sample', name: '중지테스트GA',
    ceo_name: null, description: null,
    logo_path: null, status: 'visible',
    is_verified: false, verified_at: null, verified_by_admin_id: null,
    approval_status: 'suspended', approval_reason: '자료 확인 필요', reviewed_by_admin_id: null, reviewed_at: daysAgo(3),
    created_at: daysAgo(45), updated_at: daysAgo(3), display_priority: 0,
  },
  {
    id: 'ga-6', slug: 'jeongdo', name: '정도',
    ceo_name: '정도현', description: '원칙과 정도(正道)를 지키는 정직한 보험 컨설팅을 지향하는 GA입니다.',
    logo_path: '/mock-logos/jeongdo.png', status: 'visible',
    is_verified: true, verified_at: daysAgo(60), verified_by_admin_id: 'mock-admin-1',
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(70),
    created_at: daysAgo(100), updated_at: daysAgo(4), display_priority: 106,
  },
  {
    id: 'ga-7', slug: 'route-logistics', name: '루트',
    ceo_name: '노선일', description: '고객에게 맞는 최적의 보장 루트를 설계하는 GA입니다.',
    logo_path: '/mock-logos/route.png', status: 'visible',
    is_verified: false, verified_at: null, verified_by_admin_id: null,
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(40),
    created_at: daysAgo(70), updated_at: daysAgo(6), display_priority: 105,
  },
  {
    id: 'ga-8', slug: 'map-group', name: '맵그룹',
    ceo_name: '김지도', description: '데이터 기반 컨설팅으로 고객의 보장 지도를 그리는 GA입니다.',
    logo_path: '/mock-logos/mapgroup.png', status: 'visible',
    is_verified: true, verified_at: daysAgo(30), verified_by_admin_id: 'mock-admin-1',
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(35),
    created_at: daysAgo(50), updated_at: daysAgo(8), display_priority: 104,
  },
  {
    id: 'ga-9', slug: 'insurance-superman', name: '보험슈퍼맨',
    ceo_name: '강슈퍼', description: '빠르고 강력한 보장 설계로 고객을 지키는 GA입니다.',
    logo_path: '/mock-logos/insurance-superman.png', status: 'visible',
    is_verified: false, verified_at: null, verified_by_admin_id: null,
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(20),
    created_at: daysAgo(40), updated_at: daysAgo(3), display_priority: 103,
  },
  {
    id: 'ga-10', slug: 'essential-insurance', name: '에센셜',
    ceo_name: '오필수', description: '꼭 필요한 보장만 담은 에센셜(Essential) 설계를 지향하는 GA입니다.',
    logo_path: '/mock-logos/essential.png', status: 'visible',
    is_verified: true, verified_at: daysAgo(15), verified_by_admin_id: 'mock-admin-1',
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(18),
    created_at: daysAgo(30), updated_at: daysAgo(1), display_priority: 102,
  },
  {
    id: 'ga-11', slug: 'apdo-insurance', name: 'APDO(압도)',
    ceo_name: '전압도', description: '압도적인 상품 비교와 설계 역량을 갖춘 GA입니다.',
    logo_path: '/mock-logos/apdo.png', status: 'visible',
    is_verified: false, verified_at: null, verified_by_admin_id: null,
    approval_status: 'approved', approval_reason: null, reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(10),
    created_at: daysAgo(20), updated_at: daysAgo(2), display_priority: 101,
  },
];

const branches: MockBranch[] = [
  {
    id: 'branch-1', slug: 'kb-gangnam', ga_company_id: 'ga-1', region_id: regionIdBySigunguName('11', '강남구'),
    name: 'KB인슈어런스파트너스 강남본점', manager_name: '김지점',
    address: '서울특별시 강남구 테헤란로 123', address_detail: '5층',
    lat: 37.5006, lng: 127.0364,
    intro_text: '강남 중심가에 위치한 본점으로, 다양한 상품군과 전문 컨설턴트를 보유하고 있습니다.',
    education_info: '매주 화/목 신입 교육 진행, 온라인 상품 교육 플랫폼 제공',
    welfare_info: '4대보험, 경조사비 지원, 자기계발비 월 10만원',
    db_support_info: '신규 설계사 월 100건 DB 무상 제공',
    settlement_support_info: '입사 첫 6개월 정착지원금 매월 지급',
    atmosphere_info: '수평적인 소통 문화, 매주 금요일 팀별 성과 공유 세션 운영.',
    planner_count: 45, parking_available: true, visit_consult_available: true, business_hours: '평일 09:00-18:00 (토요일 사전예약제)',
    operation_type: 'direct', is_headquarters: true,
    organic_view_count: 482, imported_view_count: 0, correction_view_count: 0,
    is_recommended: true, recommended_rank: 1, status: 'visible',
    created_at: daysAgo(180), updated_at: daysAgo(4), deleted_at: null, display_priority: 0,
  },
  {
    id: 'branch-2', slug: 'kb-haeundae', ga_company_id: 'ga-1', region_id: regionIdBySigunguName('26', '해운대구'),
    name: 'KB인슈어런스파트너스 부산해운대지점', manager_name: null,
    address: '부산광역시 해운대구 센텀중앙로 45', address_detail: null,
    lat: 35.1691, lng: 129.1306,
    intro_text: '부산·경남 지역 고객을 위한 거점 지점입니다.',
    education_info: '월 2회 정기 세미나', welfare_info: '4대보험, 경조사비 지원',
    db_support_info: null, settlement_support_info: '정착지원금 3개월 지급',
    atmosphere_info: null,
    planner_count: 18, parking_available: true, visit_consult_available: true, business_hours: '평일 09:00-18:00',
    operation_type: 'direct', is_headquarters: false,
    organic_view_count: 156, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(150), updated_at: daysAgo(20), deleted_at: null, display_priority: 0,
  },
  {
    id: 'branch-3', slug: 'good-insurance-seocho', ga_company_id: 'ga-2', region_id: regionIdBySigunguName('11', '서초구'),
    name: '굿인슈런스파트너스 서초지점', manager_name: '이지점장',
    address: '서울특별시 서초구 서초대로 456', address_detail: '3층',
    lat: 37.4919, lng: 127.0074,
    intro_text: '신입 설계사 정착률 90% 이상, 1:1 멘토링 시스템 운영.',
    education_info: '3주 집중 신입 양성과정 무료 제공',
    welfare_info: '4대보험, 사무실 개인 좌석 제공, 주차 지원',
    db_support_info: '신규 설계사 첫 3개월 DB 전액 지원',
    settlement_support_info: '정착지원금 최대 6개월, 월 최대 150만원',
    atmosphere_info: '자유로운 출퇴근, 개인 역량을 존중하는 문화.',
    planner_count: 32, parking_available: false, visit_consult_available: true, business_hours: '평일 09:00-19:00',
    operation_type: 'branch', is_headquarters: true,
    organic_view_count: 731, imported_view_count: 12, correction_view_count: 0,
    is_recommended: true, recommended_rank: 2, status: 'visible',
    created_at: daysAgo(130), updated_at: daysAgo(1), deleted_at: null, display_priority: 0,
  },
  {
    id: 'branch-4', slug: 'good-insurance-suwon', ga_company_id: 'ga-2', region_id: regionIdBySigunguName('41', '수원시'),
    name: '굿인슈런스파트너스 수원지점', manager_name: null,
    address: '경기도 수원시 팔달구 인계로 78', address_detail: null,
    lat: 37.2636, lng: 127.0286,
    intro_text: '경기 남부 최대 규모 지점.',
    education_info: '매주 수요일 상품 교육', welfare_info: '4대보험', db_support_info: '월 50건 DB 지원',
    settlement_support_info: null,
    atmosphere_info: null,
    planner_count: 15, parking_available: true, visit_consult_available: false, business_hours: '평일 09:00-18:00',
    operation_type: 'branch', is_headquarters: false,
    organic_view_count: 89, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(60), updated_at: daysAgo(15), deleted_at: null, display_priority: 0,
  },
  {
    id: 'branch-5', slug: 'hanwha-total-yeouido', ga_company_id: 'ga-3', region_id: regionIdBySigunguName('11', '영등포구'),
    name: '한화토탈인슈어런스 여의도지점', manager_name: null,
    address: '서울특별시 영등포구 여의대로 24', address_detail: '12층',
    lat: 37.5257, lng: 126.9245,
    intro_text: null, education_info: null, welfare_info: null, db_support_info: null, settlement_support_info: null,
    atmosphere_info: null,
    planner_count: null, parking_available: null, visit_consult_available: null, business_hours: null,
    operation_type: 'direct', is_headquarters: true,
    organic_view_count: 34, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(20), updated_at: daysAgo(20), deleted_at: null, display_priority: 0,
  },
  {
    id: 'branch-6', slug: 'kb-daejeon', ga_company_id: 'ga-1', region_id: regionIdBySigunguName('30', '서구'),
    name: 'KB인슈어런스파트너스 대전지점', manager_name: null,
    address: '대전광역시 서구 둔산로 100', address_detail: null,
    lat: 36.3504, lng: 127.3845,
    intro_text: '대전·충청 지역 신규 오픈 지점입니다.',
    education_info: '신입 교육 지원', welfare_info: '4대보험', db_support_info: null, settlement_support_info: '정착지원금 3개월',
    atmosphere_info: null,
    planner_count: 6, parking_available: true, visit_consult_available: true, business_hours: '평일 09:00-18:00',
    operation_type: 'direct', is_headquarters: false,
    organic_view_count: 12, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(3), updated_at: daysAgo(3), deleted_at: null, display_priority: 0,
  },
  {
    id: 'branch-7', slug: 'jeongdo', ga_company_id: 'ga-6', region_id: regionIdBySigunguName('11', '강남구'),
    name: '정도지점', manager_name: '정도현',
    address: '서울특별시 강남구 논현로 152', address_detail: '8층',
    lat: 37.5089, lng: 127.0324,
    intro_text: '원칙을 지키는 정직한 보장 설계, 정도(正道)가 답입니다.',
    education_info: '월 4회 상품 교육 및 컴플라이언스 교육', welfare_info: '4대보험, 인센티브 별도 지급',
    db_support_info: '신규 설계사 DB 지원', settlement_support_info: '정착지원금 4개월',
    atmosphere_info: '원칙과 정도를 지키는 정직한 분위기, 22년 경력 대표가 직접 코칭.',
    planner_count: 22, parking_available: true, visit_consult_available: true, business_hours: '평일 09:00-18:00',
    operation_type: 'branch', is_headquarters: true,
    organic_view_count: 45, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(100), updated_at: daysAgo(4), deleted_at: null, display_priority: 106,
  },
  {
    id: 'branch-8', slug: 'route-incheon', ga_company_id: 'ga-7', region_id: regionIdBySigunguName('28', '연수구'),
    name: '루트지점', manager_name: '노선일',
    address: '인천광역시 연수구 컨벤시아대로 165', address_detail: '3층',
    lat: 37.3943, lng: 126.6389,
    intro_text: '고객에게 맞는 최적의 보장 루트를 함께 찾아드립니다.',
    education_info: '신입 온보딩 2주 과정', welfare_info: '4대보험',
    db_support_info: null, settlement_support_info: '정착지원금 3개월',
    atmosphere_info: null,
    planner_count: 14, parking_available: true, visit_consult_available: false, business_hours: '평일 09:00-18:00',
    operation_type: 'branch', is_headquarters: true,
    organic_view_count: 21, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(70), updated_at: daysAgo(6), deleted_at: null, display_priority: 105,
  },
  {
    id: 'branch-9', slug: 'mapgroup-jongno', ga_company_id: 'ga-8', region_id: regionIdBySigunguName('11', '종로구'),
    name: '맵그룹 본점', manager_name: '김지도',
    address: '서울특별시 종로구 종로 33', address_detail: '15층',
    lat: 37.5704, lng: 126.9910,
    intro_text: '데이터 기반 컨설팅으로 고객만의 보장 지도를 그립니다.',
    education_info: '데이터 분석 툴 교육 포함 신입 과정', welfare_info: '4대보험, 자기계발비 지원',
    db_support_info: '월 80건 DB 지원', settlement_support_info: '정착지원금 최대 5개월',
    atmosphere_info: '데이터·분석을 중시하는 논리적인 팀 문화.',
    planner_count: 38, parking_available: false, visit_consult_available: true, business_hours: '평일 09:00-19:00',
    operation_type: 'direct', is_headquarters: true,
    organic_view_count: 63, imported_view_count: 0, correction_view_count: 0,
    is_recommended: true, recommended_rank: 3, status: 'visible',
    created_at: daysAgo(50), updated_at: daysAgo(8), deleted_at: null, display_priority: 104,
  },
  {
    id: 'branch-10', slug: 'superman-seocho', ga_company_id: 'ga-9', region_id: regionIdBySigunguName('11', '서초구'),
    name: '보험슈퍼맨 본부', manager_name: '강슈퍼',
    address: '서울특별시 서초구 강남대로 429', address_detail: '10층',
    lat: 37.4989, lng: 127.0276,
    intro_text: '빠르고 강력한 보장 설계로 고객을 든든하게 지켜드립니다.',
    education_info: '주 1회 실전 세일즈 트레이닝', welfare_info: '4대보험, 우수 설계사 포상',
    db_support_info: '신규 설계사 DB 무상 지원', settlement_support_info: '정착지원금 최대 6개월',
    atmosphere_info: '목표 지향적이고 에너지 넘치는 영업 문화.',
    planner_count: 51, parking_available: true, visit_consult_available: true, business_hours: '평일 09:00-19:00 (토요일 상담 가능)',
    operation_type: 'branch', is_headquarters: true,
    organic_view_count: 98, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(40), updated_at: daysAgo(3), deleted_at: null, display_priority: 103,
  },
  {
    id: 'branch-11', slug: 'essential-busan', ga_company_id: 'ga-10', region_id: regionIdBySigunguName('26', '사하구'),
    name: '에센셜지점', manager_name: '오필수',
    address: '부산광역시 사하구 낙동대로 550', address_detail: '2층',
    lat: 35.1044, lng: 128.9743,
    intro_text: '꼭 필요한 보장만 담은 에센셜(Essential) 설계를 제안합니다.',
    education_info: '월 2회 정기 교육', welfare_info: '4대보험',
    db_support_info: null, settlement_support_info: '정착지원금 3개월',
    atmosphere_info: null,
    planner_count: 9, parking_available: true, visit_consult_available: true, business_hours: '평일 09:00-18:00',
    operation_type: 'branch', is_headquarters: true,
    organic_view_count: 17, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(30), updated_at: daysAgo(1), deleted_at: null, display_priority: 102,
  },
  {
    id: 'branch-12', slug: 'apdo-daegu', ga_company_id: 'ga-11', region_id: regionIdBySigunguName('27', '중구'),
    name: '압도 본부', manager_name: '전압도',
    address: '대구광역시 중구 동성로 88', address_detail: '6층',
    lat: 35.8688, lng: 128.5945,
    intro_text: '압도적인 상품 비교와 설계 역량으로 지역 1위를 지향합니다.',
    education_info: '신입 3주 집중 양성과정', welfare_info: '4대보험, 사무실 개인 좌석 제공',
    db_support_info: '월 60건 DB 지원', settlement_support_info: '정착지원금 최대 4개월',
    atmosphere_info: null,
    planner_count: 19, parking_available: true, visit_consult_available: false, business_hours: '평일 09:00-18:00',
    operation_type: 'branch', is_headquarters: true,
    organic_view_count: 8, imported_view_count: 0, correction_view_count: 0,
    is_recommended: false, recommended_rank: null, status: 'visible',
    created_at: daysAgo(20), updated_at: daysAgo(2), deleted_at: null, display_priority: 101,
  },
];

// 검색 필터(GA 선택) UI 데모용으로 추가된 52개 GA사. 각각 대표 지점 1개씩 자동 생성한다.
const EXTRA_GA_NAMES = [
  '한화생명금융서비스', 'GA Korea', '인카금융서비스', '에이플러스에셋', '굿리치', '프라임에셋', '피플라이프',
  '엠금융서비스', '리치앤코', '메가(Mega)', '글로벌금융판매', '리더스금융판매', '한국보험금융', '유퍼스트보험대리점',
  'KGA에셋', '메리츠금융서비스', 'IFA', '한국재무설계', 'DB금융서비스', '삼성생명금융서비스', '신한금융플러스',
  '농협생명금융서비스', '원금융서비스', '영진에셋', 'GS손해사정', 'GSMNS', '리더스에셋', 'FR자산관리',
  '에즈금융서비스', '코어인슈어런스', 'BQ자산관리', 'LK자산관리', '키움에셋플래너', 'HS컨설팅', 'W에셋',
  'SK증권보험서비스', 'JS자산관리', 'KB라이프파트너스', 'CM보험대리점', '아이파트너스', 'VIP파트너스',
  'US보험대리점', '더휴먼보험대리점', 'GN보험대리점', '퍼스트에셋', '조은보험대리점', '인스팜', '베스트파트너스',
  '리더스파트너스', '인슈코리아', '스카이블루에셋', '메타리치',
];

// 각 시/도의 첫 번째 시/군/구로 지점 지역을 순환 배정한다 (regionIdBySigunguName 조회용).
// 좌표는 시/도 중심 좌표를 재사용하고 아래에서 지점별로 소량의 오프셋을 더해 지도 마커가 겹치지 않게 한다.
const SIDO_FIRST_SIGUNGU: [string, string, string, number, number][] = [
  ['11', '서울특별시', '종로구', 37.5665, 126.978],
  ['26', '부산광역시', '중구', 35.1796, 129.0756],
  ['27', '대구광역시', '중구', 35.8714, 128.6014],
  ['28', '인천광역시', '중구', 37.4563, 126.7052],
  ['29', '광주광역시', '동구', 35.1595, 126.8526],
  ['30', '대전광역시', '동구', 36.3504, 127.3845],
  ['31', '울산광역시', '중구', 35.5384, 129.3114],
  ['41', '경기도', '수원시', 37.4138, 127.5183],
  ['42', '강원특별자치도', '춘천시', 37.8228, 128.1555],
  ['43', '충청북도', '청주시', 36.6357, 127.4917],
  ['44', '충청남도', '천안시', 36.5184, 126.8],
  ['45', '전북특별자치도', '전주시', 35.7175, 127.153],
  ['46', '전라남도', '목포시', 34.8679, 126.991],
  ['47', '경상북도', '포항시', 36.4919, 128.8889],
  ['48', '경상남도', '창원시', 35.4606, 128.2132],
  ['50', '제주특별자치도', '제주시', 33.4996, 126.5312],
];

// 보험사 계열 브랜드명이 포함된 GA는 '직영'(direct), 나머지 독립 GA 대리점은 '지사'(branch)로 분류한다.
const DIRECT_NAME_KEYWORDS = ['한화생명', '삼성생명', '신한금융플러스', '농협생명', 'DB금융서비스', 'KB라이프', '메리츠금융서비스'];

const extraGaCompanies: MockGaCompany[] = EXTRA_GA_NAMES.map((name, i) => {
  return {
    id: `ga-extra-${i + 1}`,
    slug: `ga-extra-${i + 1}`,
    name,
    ceo_name: null,
    description: `${name}의 보험 상담 및 설계 서비스를 제공하는 GA입니다.`,
    logo_path: null,
    status: 'visible',
    is_verified: i % 5 === 0,
    verified_at: i % 5 === 0 ? daysAgo(30 + i) : null,
    verified_by_admin_id: i % 5 === 0 ? 'mock-admin-1' : null,
    approval_status: 'approved',
    approval_reason: null,
    reviewed_by_admin_id: 'mock-admin-1',
    reviewed_at: daysAgo(40 + i),
    created_at: daysAgo(90 + i),
    updated_at: daysAgo(i % 20),
    display_priority: 0,
  };
});

const extraBranches: MockBranch[] = EXTRA_GA_NAMES.map((name, i) => {
  const [sidoCode, sidoName, sigunguName, baseLat, baseLng] = SIDO_FIRST_SIGUNGU[i % SIDO_FIRST_SIGUNGU.length];
  // 같은 시/도로 배정된 지점끼리 마커가 겹치지 않도록 ±0.05 범위에서 결정론적으로 흩뿌린다.
  const jitter = (seed: number) => ((seed * 37) % 100) / 100 - 0.5;
  return {
    id: `branch-extra-${i + 1}`,
    slug: `ga-extra-${i + 1}-branch`,
    ga_company_id: `ga-extra-${i + 1}`,
    region_id: regionIdBySigunguName(sidoCode, sigunguName),
    name: `${name} 본점`,
    manager_name: null,
    address: `${sidoName} ${sigunguName} 중앙로 ${100 + i}`,
    address_detail: null,
    lat: baseLat + jitter(i) * 0.1,
    lng: baseLng + jitter(i + 1) * 0.1,
    intro_text: `${name}의 대표 지점입니다.`,
    education_info: null,
    welfare_info: null,
    db_support_info: null,
    settlement_support_info: null,
    atmosphere_info: null,
    planner_count: 15 + ((i * 37) % 380),
    parking_available: i % 3 !== 0,
    visit_consult_available: true,
    business_hours: '평일 09:00-18:00',
    operation_type: DIRECT_NAME_KEYWORDS.some((k) => name.includes(k)) ? 'direct' : 'branch',
    is_headquarters: true,
    organic_view_count: 5 + ((i * 3) % 50),
    imported_view_count: 0,
    correction_view_count: 0,
    is_recommended: false,
    recommended_rank: null,
    status: 'visible',
    created_at: daysAgo(90 + i),
    updated_at: daysAgo(i % 20),
    deleted_at: null,
    display_priority: 0,
  };
});

gaCompanies.push(...extraGaCompanies);
branches.push(...extraBranches);

const branchMedia: MockBranchMedia[] = [
  { id: 'media-1', branch_id: 'branch-1', media_type: 'video', source: 'external', value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', sort_order: 0, created_at: daysAgo(100) },
  // 홈 화면 카드/지점 상세 대표사진 - 로고 이미지를 대표사진으로도 재사용한다(실사진 없는 mock 지점용).
  { id: 'media-2', branch_id: 'branch-7', media_type: 'image_main', source: 'storage', value: '/mock-logos/jeongdo.png', sort_order: 0, created_at: daysAgo(100) },
  { id: 'media-3', branch_id: 'branch-8', media_type: 'image_main', source: 'storage', value: '/mock-logos/route.png', sort_order: 0, created_at: daysAgo(70) },
  { id: 'media-4', branch_id: 'branch-9', media_type: 'image_main', source: 'storage', value: '/mock-logos/mapgroup.png', sort_order: 0, created_at: daysAgo(50) },
  { id: 'media-5', branch_id: 'branch-10', media_type: 'image_main', source: 'storage', value: '/mock-logos/insurance-superman.png', sort_order: 0, created_at: daysAgo(40) },
  { id: 'media-6', branch_id: 'branch-11', media_type: 'image_main', source: 'storage', value: '/mock-logos/essential.png', sort_order: 0, created_at: daysAgo(30) },
  { id: 'media-7', branch_id: 'branch-12', media_type: 'image_main', source: 'storage', value: '/mock-logos/apdo.png', sort_order: 0, created_at: daysAgo(20) },
];

const branchContacts: MockBranchContact[] = [
  { id: 'contact-1', branch_id: 'branch-1', type: 'phone', value: '02-1234-5678', label: null, sort_order: 0, created_at: daysAgo(180), updated_at: daysAgo(180) },
  { id: 'contact-2', branch_id: 'branch-1', type: 'kakao', value: 'https://pf.kakao.com/_kbinsure', label: null, sort_order: 1, created_at: daysAgo(180), updated_at: daysAgo(180) },
  { id: 'contact-3', branch_id: 'branch-1', type: 'homepage', value: 'https://example.com', label: null, sort_order: 2, created_at: daysAgo(180), updated_at: daysAgo(180) },
  { id: 'contact-4', branch_id: 'branch-1', type: 'instagram', value: 'https://instagram.com/kb_insure_partners', label: null, sort_order: 3, created_at: daysAgo(180), updated_at: daysAgo(180) },
  { id: 'contact-4b', branch_id: 'branch-1', type: 'blog', value: 'https://blog.naver.com/kb-insure-partners', label: null, sort_order: 4, created_at: daysAgo(180), updated_at: daysAgo(180) },
  { id: 'contact-4c', branch_id: 'branch-1', type: 'youtube', value: 'https://www.youtube.com/@kb-insure-partners', label: null, sort_order: 5, created_at: daysAgo(180), updated_at: daysAgo(180) },
  { id: 'contact-5', branch_id: 'branch-3', type: 'phone', value: '02-9876-5432', label: '대표전화', sort_order: 0, created_at: daysAgo(130), updated_at: daysAgo(130) },
  { id: 'contact-6', branch_id: 'branch-3', type: 'phone_recruit', value: '02-9876-5433', label: '채용 전용', sort_order: 1, created_at: daysAgo(130), updated_at: daysAgo(130) },
  { id: 'contact-7', branch_id: 'branch-3', type: 'kakao', value: 'https://pf.kakao.com/_example', label: null, sort_order: 2, created_at: daysAgo(130), updated_at: daysAgo(130) },
  { id: 'contact-8', branch_id: 'branch-2', type: 'phone', value: '051-123-4567', label: null, sort_order: 0, created_at: daysAgo(150), updated_at: daysAgo(150) },
  { id: 'contact-9', branch_id: 'branch-7', type: 'phone', value: '02-2345-6789', label: null, sort_order: 0, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'contact-10', branch_id: 'branch-7', type: 'homepage', value: 'https://jeongdo.example.com', label: null, sort_order: 1, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'contact-11', branch_id: 'branch-7', type: 'blog', value: 'https://blog.naver.com/jeongdo-insure', label: null, sort_order: 2, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'contact-12', branch_id: 'branch-7', type: 'instagram', value: 'https://instagram.com/jeongdo_insure', label: null, sort_order: 3, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'contact-13', branch_id: 'branch-7', type: 'kakao', value: 'https://pf.kakao.com/_jeongdo', label: null, sort_order: 4, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'contact-14', branch_id: 'branch-7', type: 'kakao_open_chat', value: 'https://open.kakao.com/o/jeongdo', label: null, sort_order: 5, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'contact-15', branch_id: 'branch-9', type: 'phone', value: '02-3456-7890', label: null, sort_order: 0, created_at: daysAgo(50), updated_at: daysAgo(50) },
  { id: 'contact-16', branch_id: 'branch-9', type: 'homepage', value: 'https://mapgroup.example.com', label: null, sort_order: 1, created_at: daysAgo(50), updated_at: daysAgo(50) },
  { id: 'contact-17', branch_id: 'branch-9', type: 'instagram', value: 'https://instagram.com/mapgroup_insure', label: null, sort_order: 2, created_at: daysAgo(50), updated_at: daysAgo(50) },
  { id: 'contact-18', branch_id: 'branch-9', type: 'youtube', value: 'https://www.youtube.com/@mapgroup', label: null, sort_order: 3, created_at: daysAgo(50), updated_at: daysAgo(50) },
  { id: 'contact-19', branch_id: 'branch-9', type: 'kakao', value: 'https://pf.kakao.com/_mapgroup', label: null, sort_order: 4, created_at: daysAgo(50), updated_at: daysAgo(50) },
];

const branchRecruits: MockBranchRecruit[] = [
  { id: 'recruit-1', branch_id: 'branch-1', title: '2026년 상반기 신입/경력 설계사 모집', content: '학력 무관, 정착지원금 최대 6개월 지급. 지금 지원하세요!', employment_type: '위촉직', is_active: true, start_at: daysAgo(10), end_at: null, created_at: daysAgo(10), updated_at: daysAgo(10) },
  { id: 'recruit-2', branch_id: 'branch-3', title: '경력 설계사 우대 채용', content: '기존 고객 DB 인수 가능, 높은 수수료율 보장.', employment_type: '위촉직', is_active: true, start_at: daysAgo(5), end_at: null, created_at: daysAgo(5), updated_at: daysAgo(5) },
  { id: 'recruit-3', branch_id: 'branch-3', title: '마감된 공고 예시', content: '마감되었습니다.', employment_type: '정규직', is_active: false, start_at: daysAgo(60), end_at: daysAgo(20), created_at: daysAgo(60), updated_at: daysAgo(20) },
];

const branchInsurers: { branch_id: string; insurer_id: string }[] = [
  { branch_id: 'branch-1', insurer_id: 'insurer-1' },
  { branch_id: 'branch-1', insurer_id: 'insurer-14' },
  { branch_id: 'branch-1', insurer_id: 'insurer-15' },
  { branch_id: 'branch-1', insurer_id: 'insurer-17' },
  { branch_id: 'branch-3', insurer_id: 'insurer-2' },
  { branch_id: 'branch-3', insurer_id: 'insurer-3' },
  { branch_id: 'branch-3', insurer_id: 'insurer-16' },
  { branch_id: 'branch-2', insurer_id: 'insurer-1' },
];

const contactClicks: { id: string; branch_id: string; contact_id: string | null; contact_type: string; created_at: string }[] = [
  { id: 'click-1', branch_id: 'branch-1', contact_id: 'contact-1', contact_type: 'phone', created_at: daysAgo(0) },
  { id: 'click-2', branch_id: 'branch-1', contact_id: 'contact-2', contact_type: 'kakao', created_at: daysAgo(1) },
  { id: 'click-3', branch_id: 'branch-3', contact_id: 'contact-5', contact_type: 'phone', created_at: daysAgo(0) },
];

const branchViews: { id: string; branch_id: string; created_at: string }[] = [
  { id: 'view-1', branch_id: 'branch-1', created_at: daysAgo(0) },
  { id: 'view-2', branch_id: 'branch-3', created_at: daysAgo(0) },
  { id: 'view-3', branch_id: 'branch-1', created_at: daysAgo(1) },
];

// lib/admin/session.mock.ts의 MOCK_ADMIN과 동일한 id를 쓴다 - 승인/반려 로그에 이름을 붙이기 위한 조회용.
const adminUsers: MockAdminUser[] = [{ id: 'mock-admin-1', display_name: '(Mock) 관리자' }];

// 파트너(GA 운영자) 데모 계정. 실제 배포 전 password는 Supabase Auth로 완전히 교체해야 한다.
const gaAdminUsers: MockGaAdminUser[] = [
  {
    id: 'gaadmin-1', ga_company_id: 'ga-2', branch_id: null,
    email: 'partner@goodinsurance.mock', password: 'demo1234', display_name: '이대표',
    is_active: true, created_at: daysAgo(140), updated_at: daysAgo(140),
  },
  {
    id: 'gaadmin-2', ga_company_id: 'ga-4', branch_id: null,
    email: 'partner@firstinsure.mock', password: 'demo1234', display_name: '최대표',
    is_active: true, created_at: daysAgo(1), updated_at: daysAgo(1),
  },
];

const changeRequests: MockChangeRequest[] = [
  {
    id: 'change-1', target_type: 'ga_branch', target_id: 'branch-3', ga_company_id: 'ga-2', action: 'update',
    submitted_by_ga_admin_id: 'gaadmin-1', status: 'approved', review_reason: null,
    reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(2),
    field_changes: [{ field: 'planner_count', label: '설계사 수', oldValue: '20명', newValue: '32명' }],
    raw_new_values: { planner_count: 32 },
    created_at: daysAgo(2),
  },
  {
    id: 'change-2', target_type: 'ga_branch', target_id: 'branch-3', ga_company_id: 'ga-2', action: 'update',
    submitted_by_ga_admin_id: 'gaadmin-1', status: 'approved', review_reason: null,
    reviewed_by_admin_id: 'mock-admin-1', reviewed_at: daysAgo(1),
    field_changes: [{ field: 'parking_available', label: '주차 가능 여부', oldValue: '가능', newValue: '불가능' }],
    raw_new_values: { parking_available: false },
    created_at: daysAgo(1),
  },
  {
    id: 'change-3', target_type: 'ga_company', target_id: 'ga-2', ga_company_id: 'ga-2', action: 'update',
    submitted_by_ga_admin_id: 'gaadmin-1', status: 'pending', review_reason: null,
    reviewed_by_admin_id: null, reviewed_at: null,
    field_changes: [
      {
        field: 'description', label: 'GA 소개',
        oldValue: '신입 설계사 정착 지원과 체계적인 교육 시스템이 강점인 GA입니다.',
        newValue: '신입 설계사 정착 지원과 체계적인 교육 시스템이 강점인 GA입니다. 2026년 하반기 전 지점 리모델링을 완료했습니다.',
      },
    ],
    raw_new_values: {
      description: '신입 설계사 정착 지원과 체계적인 교육 시스템이 강점인 GA입니다. 2026년 하반기 전 지점 리모델링을 완료했습니다.',
    },
    created_at: daysAgo(0),
  },
];

// 일반 회원/즐겨찾기 - 로그인 버튼을 누르는 순간 채워지므로 시드 데이터가 필요 없다.
const users: MockUser[] = [];
const favorites: MockFavorite[] = [];
// 리뷰/최근 본 GA는 이번 스코프에서 타입만 정의한다(향후 확장용, 아직 아무도 채우지 않음).
const reviews: MockReview[] = [];
const recentViews: MockRecentView[] = [];

return {
    regions,
    insurers,
    gaCompanies,
    branches,
    branchMedia,
    branchContacts,
    branchRecruits,
    branchInsurers,
    contactClicks,
    branchViews,
    adminUsers,
    gaAdminUsers,
    changeRequests,
    users,
    favorites,
    reviews,
    recentViews,

    genId(prefix: string): string {
      return `${prefix}-${randomUUID().slice(0, 8)}`;
    },
    nowIso(): string {
      return new Date().toISOString();
    },
  };
}

type MockStoreShape = ReturnType<typeof buildMockStore>;

/**
 * Next.js는 라우트마다 서버 번들을 따로 구성하기 때문에, 이 모듈이 여러 라우트에서
 * import되면 모듈 레벨 변수만으로는 인스턴스가 라우트마다 따로 생겨 상태가 공유되지
 * 않는다(예: 지점 상세에서 늘린 조회수가 관리자 대시보드에는 반영되지 않음).
 * Prisma 싱글턴 패턴과 동일하게 globalThis에 캐싱해 프로세스 전체에서 하나만 쓴다.
 */
const globalForMockStore = globalThis as unknown as { __bohommapMockStore?: MockStoreShape };

/** lib/public, lib/admin이 공유하는 인메모리 mock 저장소. */
export const mockStore: MockStoreShape = globalForMockStore.__bohommapMockStore ?? buildMockStore();

if (!globalForMockStore.__bohommapMockStore) {
  globalForMockStore.__bohommapMockStore = mockStore;
}
