// =========================================================
// seed/_seed_tmp.mjs
// 보험맵 운영 시연용 더미(seed) 데이터 생성 스크립트.
//
//   node seed/_seed_tmp.mjs   (또는 npm run seed)
//
// 여러 번 실행해도 데이터가 계속 늘어나지 않도록 idempotent하게 작성했다.
// 상세한 동작 방식/재실행/복구 방법은 seed/README.md 참고.
//
// 이 파일은 임시 산출물(_seed_tmp 접두사)로, 1회성 데이터 시딩이 끝나면
// 저장소에서 지워도 무방하다 - 앱 런타임 코드와는 완전히 무관하다.
// =========================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const START_TIME = Date.now();
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

// ---------------------------------------------------------
// 안전망 - 어디서든 처리 안 된 에러가 새 나오면 Node 기본 스택트레이스 대신
// 친절한 메시지로 종료한다. (요청 2: "Unhandled Error가 발생하지 않게")
//
// process.exit()를 네트워크 요청(fetch/undici) 직후 같은 틱에서 바로 호출하면
// Windows에서 libuv 핸들 정리와 경합해 "Assertion failed: ... UV_HANDLE_CLOSING"
// 크래시가 날 수 있다. 그래서 강제 종료(process.exit)는 쓰지 않고
// process.exitCode만 설정해 이벤트 루프가 자연스럽게(방금 끝난 네트워크 핸들이
// 알아서 정리된 뒤) 종료되도록 둔다 - 에러 상황에서는 남은 작업이 없어 보통
// 수 ms 안에 자연 종료된다. 혹시 뭔가 핸들이 안 닫히고 남는 극단적 경우를
// 대비해서만 2초 뒤 unref 타이머로 강제 종료한다(정상 종료를 막지 않음).
// friendlyFatal은 SeedFatalError를 던져 호출부의 코드 흐름을 즉시 멈추고,
// 이미 메시지를 출력했다는 걸 표시해둔다(전역 핸들러가 같은 내용을 중복 출력하지
// 않도록).
// ---------------------------------------------------------
class SeedFatalError extends Error {}

function friendlyFatal(title, err) {
  console.error('');
  console.error('==========================');
  console.error(title);
  console.error('==========================');
  console.error('');
  console.error(err?.message ?? String(err));
  console.error('');
  process.exitCode = 1;
  const forceExit = setTimeout(() => process.exit(1), 2000);
  forceExit.unref();
  throw new SeedFatalError(title);
}
process.on('unhandledRejection', (reason) => {
  if (reason instanceof SeedFatalError) return;
  friendlyFatal('예상치 못한 오류로 스크립트를 종료합니다', reason);
});
process.on('uncaughtException', (err) => {
  if (err instanceof SeedFatalError) return;
  friendlyFatal('예상치 못한 오류로 스크립트를 종료합니다', err);
});

// ---------------------------------------------------------
// 0. 환경변수 로드 - dotenv 의존성 없이 seed/.env를 직접 파싱한다.
//    (이미 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 export되어 있으면 그대로 사용)
// ---------------------------------------------------------
function loadDotEnvIfPresent() {
  const envPath = path.join(__dirname, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvIfPresent();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) {
  friendlyFatal(
    'SUPABASE_URL이 설정되지 않았습니다',
    new Error('seed/.env.example을 seed/.env로 복사한 뒤 SUPABASE_URL 값을 채우거나, 환경변수로 export하세요.')
  );
}
if (!SERVICE_ROLE_KEY) {
  friendlyFatal(
    'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다',
    new Error('seed/.env.example을 seed/.env로 복사한 뒤 SUPABASE_SERVICE_ROLE_KEY 값을 채우세요. (Supabase 대시보드 > Project Settings > API > service_role key, anon key 아님)')
  );
}

let admin;
try {
  admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
} catch (e) {
  friendlyFatal('Supabase 클라이언트 생성에 실패했습니다', new Error(`SUPABASE_URL 형식을 확인하세요 (예: https://xxxx.supabase.co). 상세: ${e?.message}`));
}

// 서비스 롤 키가 실제로 유효한지 미리 확인한다 - listUsers는 service_role 권한이
// 있어야만 성공하므로, anon key를 잘못 넣었거나 키가 만료/취소된 경우 여기서
// 바로 걸러져 이후 단계에서 알 수 없는 에러가 뒤섞여 나오는 것을 막는다.
async function verifyServiceRoleKey() {
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    friendlyFatal(
      'Service Role Key가 유효하지 않습니다',
      new Error(
        [
          `상세: ${error.message}`,
          '',
          '확인 사항:',
          '  1) seed/.env의 SUPABASE_URL이 프로젝트 URL과 정확히 일치하는지',
          '  2) SUPABASE_SERVICE_ROLE_KEY가 anon key가 아니라 service_role key인지',
          '     (Supabase 대시보드 > Project Settings > API에서 확인)',
          '  3) 키 앞뒤에 공백/줄바꿈이 섞여 들어가지 않았는지',
        ].join('\n')
      )
    );
  }
}

// ---------------------------------------------------------
// 상태 파일 - 섹션별 완료 여부/목표 달성 여부를 기록해 재실행 시 건너뛴다.
// 지워도 안전하다 - 다시 생성되며, 신원(계정)/지점(slug)/북마크는 DB 자체의
// 유니크 제약으로도 별도 중복 방지가 걸려 있어 상태 파일 유무와 무관하게 안전하다.
// ---------------------------------------------------------
const STATE_PATH = path.join(__dirname, '.seed-state.json');
function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}
function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}
const state = loadState();

// ---------------------------------------------------------
// 유틸
// ---------------------------------------------------------
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return [...new Set(shuffled.slice(0, Math.max(0, n)))];
};
const daysAgoIso = (maxDays) => new Date(Date.now() - Math.random() * maxDays * 86400000).toISOString();
const hoursAgoIso = (maxHours) => new Date(Date.now() - Math.random() * maxHours * 3600000).toISOString();
const startOfTodayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const results = await Promise.all(batch.map(fn));
    out.push(...results);
    process.stdout.write(`    ${Math.min(i + size, items.length)}/${items.length}\r`);
  }
  if (items.length > 0) console.log('');
  return out;
}
async function countRows(table, build) {
  let q = admin.from(table).select('id', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  if (error) {
    console.error(`count(${table}) error`, error.message);
    return 0;
  }
  return count ?? 0;
}

// GoTrue Admin API로 이메일 기준 기존 계정을 조회한다 (createUser가 "이미 존재" 에러를
// 반환했을 때만 쓰는 폴백 - 정상 경로는 사전 조회로 대부분 걸러진다).
async function findAuthUserByEmail(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.users?.[0] ?? null;
}

// 이메일 기준으로 auth 계정을 멱등하게 확보한다 - 이미 있으면 그대로 재사용.
async function ensureAuthUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Seed!${Math.random().toString(36).slice(2, 12)}A1`,
    email_confirm: true,
  });
  if (!error && data?.user) return data.user.id;
  const existing = await findAuthUserByEmail(email);
  if (existing) return existing.id;
  console.error('ensureAuthUser 실패', email, error?.message);
  return null;
}

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const GIVEN = [
  '민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '준서', '건우',
  '서연', '서윤', '지우', '서현', '민서', '하은', '수아', '지민', '채원', '다은',
  '현우', '승민', '유준', '지훈', '태윤', '예은', '수빈', '다인', '시연', '채은',
];
const randomName = () => pick(SURNAMES) + pick(GIVEN);
const randomAuthorName = () => `익명${rnd(9000) + 1000}`;

const SPECIALTIES = ['자동차보험', '실손보험', '암보험', '종신보험', '어린이보험', '태아보험', '법인보험', '화재보험', '운전자보험', '재무설계', '상속증여', '은퇴설계'];

const CITIES = [
  { label: '강남', sido_code: '11', sigungu_code: '11-23', lat: 37.4979, lng: 127.0276 },
  { label: '마포', sido_code: '11', sigungu_code: '11-14', lat: 37.5663, lng: 126.9019 },
  { label: '영등포', sido_code: '11', sigungu_code: '11-19', lat: 37.5219, lng: 126.9245 },
  { label: '인천남동', sido_code: '28', sigungu_code: '28-05', lat: 37.4483, lng: 126.7316 },
  { label: '수원', sido_code: '41', sigungu_code: '41-01', lat: 37.2636, lng: 127.0286 },
  { label: '성남', sido_code: '41', sigungu_code: '41-02', lat: 37.4201, lng: 127.1265 },
  { label: '안양', sido_code: '41', sigungu_code: '41-04', lat: 37.3943, lng: 126.9568 },
  { label: '부천', sido_code: '41', sigungu_code: '41-05', lat: 37.5035, lng: 126.766 },
  { label: '광명', sido_code: '41', sigungu_code: '41-06', lat: 37.4795, lng: 126.8646 },
  { label: '고양', sido_code: '41', sigungu_code: '41-10', lat: 37.6584, lng: 126.832 },
  { label: '대전서구', sido_code: '30', sigungu_code: '30-03', lat: 36.3504, lng: 127.3845 },
  { label: '대구수성', sido_code: '27', sigungu_code: '27-06', lat: 35.858, lng: 128.6305 },
  { label: '부산해운대', sido_code: '26', sigungu_code: '26-09', lat: 35.1631, lng: 129.1635 },
  { label: '울산남구', sido_code: '31', sigungu_code: '31-02', lat: 35.5384, lng: 129.3114 },
  { label: '광주북구', sido_code: '29', sigungu_code: '29-04', lat: 35.1595, lng: 126.8526 },
  { label: '창원', sido_code: '48', sigungu_code: '48-01', lat: 35.228, lng: 128.6811 },
  { label: '천안', sido_code: '44', sigungu_code: '44-01', lat: 36.8151, lng: 127.1139 },
  { label: '전주', sido_code: '45', sigungu_code: '45-01', lat: 35.8242, lng: 127.148 },
  { label: '청주', sido_code: '43', sigungu_code: '43-01', lat: 36.6424, lng: 127.489 },
  { label: '제주', sido_code: '50', sigungu_code: '50-01', lat: 33.4996, lng: 126.5312 },
];
const STREETS = ['테헤란로', '중앙로', '시청로', '역삼로', '분당로', '평촌대로', '경인로', '오리로', '중동로', '화정로', '둔산로', '동대구로', '센텀중앙로', '삼산로', '상무대로', '창원대로', '만남로', '팔달로', '상당로', '한내로'];
const TAGLINES = ['믿고 맡기는 보험 파트너', '고객 중심 상담 문화', '신인부터 정착까지 함께', '투명한 보상 체계', '따뜻한 상담, 확실한 보장'];

const PLANNER_COUNT_TARGET = 300;
const AUTHOR_COUNT_TARGET = 200;
const REVIEW_TARGET = 500;
const COMMUNITY_TARGET = 300;
const COMMENT_TARGET = 1000;
const CHAT_TARGET = 200;
const BANNER_TARGET = 20;
const BRANCHES_PER_COMPANY = 3;

const summary = {
  gaCompanies: 0,
  branches: 0,
  planners: 0,
  authors: 0,
  posts: 0,
  comments: 0,
  chat: 0,
  reviews: 0,
  banners: 0,
};

// ---------------------------------------------------------
// Dry Run - 실제 실행과 동일한 "얼마나 부족한가" 계산을 읽기 전용 쿼리만으로
// 수행하고, insert/update/upsert/storage.upload/auth.admin.createUser는
// 단 한 번도 호출하지 않는다. 지점/설계사/작성자처럼 뒤 단계가 앞 단계의
// 실제 id에 의존하는 항목도, 대상 목록 자체는 회사 목록(ga_company)이나
// 인덱스(1..300 등)만으로 결정적으로 계산되므로 실제로 만들지 않아도 정확한
// "생성 예정 개수"를 셀 수 있다.
// ---------------------------------------------------------
async function dryRun() {
  console.log('=== DRY RUN 모드 - 실제 DB에는 아무것도 쓰지 않습니다 (조회만 수행) ===');
  const dryStart = Date.now();

  const { data: categories, error: catErr } = await admin.from('categories').select('id, slug');
  if (catErr) throw catErr;
  const categoryId = (slug) => categories.find((c) => c.slug === slug)?.id;
  for (const slug of ['review', 'free', 'question', 'info', 'ga_move', 'newcomer']) {
    if (!categoryId(slug)) {
      friendlyFatal(
        '필요한 카테고리가 없습니다',
        new Error(`'${slug}' 카테고리가 없습니다. supabase/migrations/0054_add_community_categories.sql 적용 여부를 먼저 확인하세요.`)
      );
    }
  }

  const { data: companies, error: coErr } = await admin.from('ga_company').select('id, name, slug').eq('approval_status', 'approved');
  if (coErr) throw coErr;

  // 1) GA 회사 보강 대상
  const { data: existingDetails, error: detErr } = await admin
    .from('ga_company')
    .select('id, ceo_name, description')
    .in('id', companies.map((c) => c.id));
  if (detErr) throw detErr;
  const gaToEnrich = existingDetails.filter((d) => !d.ceo_name || !d.description).length;

  // 2) 지점 + 지점 사진
  const targetBranchSlugs = [];
  for (const c of companies) {
    for (let i = 1; i <= BRANCHES_PER_COMPANY; i++) targetBranchSlugs.push(`${c.slug}-seed-b${i}`);
  }
  const { data: existingBranchRows, error: brErr } = await admin.from('ga_branch').select('id, slug');
  if (brErr) throw brErr;
  const existingSlugSet = new Set(existingBranchRows.map((b) => b.slug));
  const existingTargetBranches = existingBranchRows.filter((b) => existingSlugSet.has(b.slug) && targetBranchSlugs.includes(b.slug));
  const branchesToCreate = targetBranchSlugs.filter((s) => !existingSlugSet.has(s)).length;

  const { data: existingMediaRows, error: medErr } = await admin.from('branch_media').select('branch_id');
  if (medErr) throw medErr;
  const branchIdsWithMedia = new Set(existingMediaRows.map((m) => m.branch_id));
  const existingTargetBranchesWithoutMedia = existingTargetBranches.filter((b) => !branchIdsWithMedia.has(b.id)).length;
  const mediaToCreate = (branchesToCreate + existingTargetBranchesWithoutMedia) * 5;

  // 3) 설계사 - 계정(users)과 프로필(planner_profiles)은 각각 별도로 부족분을 센다
  const { data: existingPlannerUsers, error: puErr } = await admin.from('users').select('id, email').ilike('email', 'seed-planner-%');
  if (puErr) throw puErr;
  const plannerUsersToCreate = Math.max(0, PLANNER_COUNT_TARGET - existingPlannerUsers.length);

  const { data: existingProfilesAll, error: ppErr } = await admin.from('planner_profiles').select('id, user_id');
  if (ppErr) throw ppErr;
  const existingProfileUserIds = new Set(existingProfilesAll.map((p) => p.user_id));
  const plannerProfilesExisting = existingPlannerUsers.filter((u) => existingProfileUserIds.has(u.id)).length;
  const plannerProfilesToCreate = Math.max(0, PLANNER_COUNT_TARGET - plannerProfilesExisting);

  // 4) 커뮤니티 작성자
  const { data: existingAuthors, error: authErr } = await admin.from('anonymous_profiles').select('id, last_author_name').ilike('last_author_name', 'seed-author-%');
  if (authErr) throw authErr;
  const authorsToCreate = Math.max(0, AUTHOR_COUNT_TARGET - existingAuthors.length);

  // 5~8) 후기/커뮤니티/댓글/채팅 - 전체 개수 기준
  const reviewCategoryId = categoryId('review');
  const currentReviewCount = await countRows('posts', (q) => q.eq('category_id', reviewCategoryId));
  const reviewToCreate = Math.max(0, REVIEW_TARGET - currentReviewCount);

  const communityCategoryIds = ['free', 'question', 'info', 'ga_move', 'newcomer'].map(categoryId);
  const currentCommunityCount = await countRows('posts', (q) => q.in('category_id', communityCategoryIds));
  const communityToCreate = Math.max(0, COMMUNITY_TARGET - currentCommunityCount);

  const currentCommentCount = await countRows('comments');
  const commentsToCreate = Math.max(0, COMMENT_TARGET - currentCommentCount);

  const currentChatCount = await countRows('chat_messages');
  const chatToCreate = Math.max(0, CHAT_TARGET - currentChatCount);

  // 9) 배너 - 실제 실행과 동일하게 상태 파일 기준으로만 판단
  const bannersToCreate = state.banners?.done ? 0 : BANNER_TARGET;

  const elapsedSec = ((Date.now() - dryStart) / 1000).toFixed(1);

  console.log('');
  console.log('==========================');
  console.log('Dry Run Result (실제 DB 쓰기 없음)');
  console.log('==========================');
  console.log('');
  console.log(`GA : ${gaToEnrich}  (정보 보강 대상 - 회사 자체는 신규 생성 안 함, 총 ${companies.length}개 중)`);
  console.log(`지점 : ${branchesToCreate}  (사진 ${mediaToCreate}장 포함, 목표 ${targetBranchSlugs.length}개 중)`);
  console.log(`설계사 : ${plannerProfilesToCreate}  (신규 계정 ${plannerUsersToCreate}개 포함, 목표 ${PLANNER_COUNT_TARGET}명 중)`);
  console.log(`커뮤니티 작성자 : ${authorsToCreate}  (목표 ${AUTHOR_COUNT_TARGET}명 중)`);
  console.log(`게시글 : ${communityToCreate}  (목표 ${COMMUNITY_TARGET}개 중)`);
  console.log(`댓글 : ${commentsToCreate}  (목표 ${COMMENT_TARGET}개 중)`);
  console.log(`후기 : ${reviewToCreate}  (목표 ${REVIEW_TARGET}개 중)`);
  console.log(`채팅 : ${chatToCreate}  (목표 ${CHAT_TARGET}개 중)`);
  console.log(`배너 : ${bannersToCreate}  (목표 ${BANNER_TARGET}개 중)`);
  console.log('');
  console.log(`검증 소요시간 : ${elapsedSec}초 (조회만 수행, 쓰기 없음)`);
  console.log('');
  console.log('실제로 생성하려면: node seed/_seed_tmp.mjs   (--dry-run 옵션 없이)');
}

async function main() {
  await verifyServiceRoleKey();

  if (DRY_RUN) {
    await dryRun();
    return;
  }

  console.log('=== 보험맵 시드 데이터 생성 시작 ===');

  // -------------------------------------------------------
  // 사전 조회: regions, ga_company(승인된 50개), categories
  // -------------------------------------------------------
  const { data: regions, error: regErr } = await admin.from('regions').select('id, sido_code, sigungu_code');
  if (regErr) throw regErr;
  const regionMap = new Map(regions.map((r) => [`${r.sido_code}|${r.sigungu_code ?? ''}`, r.id]));
  const cityRegionId = (city) => regionMap.get(`${city.sido_code}|${city.sigungu_code}`) ?? null;

  const { data: companies, error: coErr } = await admin.from('ga_company').select('id, name, slug').eq('approval_status', 'approved');
  if (coErr) throw coErr;
  summary.gaCompanies = companies.length;
  console.log(`GA 회사 ${companies.length}개 확인됨`);

  const { data: categories, error: catErr } = await admin.from('categories').select('id, slug');
  if (catErr) throw catErr;
  const categoryId = (slug) => categories.find((c) => c.slug === slug)?.id;
  for (const slug of ['review', 'free', 'question', 'info', 'ga_move', 'newcomer']) {
    if (!categoryId(slug)) {
      friendlyFatal(
        '필요한 카테고리가 없습니다',
        new Error(`'${slug}' 카테고리가 없습니다. supabase/migrations/0054_add_community_categories.sql 적용 여부를 먼저 확인하세요.`)
      );
    }
  }

  // -------------------------------------------------------
  // 1. GA 회사 정보 보강 - 이미 값이 있으면 절대 덮어쓰지 않는다(자연히 idempotent).
  // -------------------------------------------------------
  console.log('1) GA 회사 정보 보강...');
  const CEO_GIVEN = ['민준 대표', '서준 대표', '도현 대표', '지훈 대표', '성민 대표', '현우 대표', '태호 대표', '준영 대표', '상현 대표', '재원 대표'];
  const DESCRIPTIONS = [
    '전국 지점망을 갖춘 종합 보험대리점으로, 체계적인 신인 교육과 안정적인 정착 지원을 제공합니다.',
    '고객 중심의 상담 문화와 투명한 보상 체계로 설계사들에게 신뢰받는 GA입니다.',
    '다양한 보험사 상품을 비교 설계할 수 있는 폭넓은 상품 라인업을 갖추고 있습니다.',
    '디지털 영업 지원 시스템과 체계적인 DB 배분으로 효율적인 영업 환경을 제공합니다.',
    '설계사의 성장을 최우선으로 생각하는 교육 인프라를 갖추고 있습니다.',
    '지역 밀착형 영업으로 고객과의 신뢰를 쌓아가는 GA입니다.',
    '우수한 정착지원금과 인센티브 제도로 많은 설계사들이 함께하고 있습니다.',
    '재무설계부터 상속증여까지 폭넓은 컨설팅 역량을 갖춘 전문 조직입니다.',
  ];
  const { data: existingDetails } = await admin.from('ga_company').select('id, ceo_name, description').in(
    'id',
    companies.map((c) => c.id)
  );
  const detailMap = new Map(existingDetails.map((d) => [d.id, d]));
  let enrichedCount = 0;
  await inBatches(companies, 10, async (c) => {
    const detail = detailMap.get(c.id);
    const patch = {};
    if (!detail?.ceo_name) patch.ceo_name = pick(SURNAMES) + pick(CEO_GIVEN);
    if (!detail?.description) patch.description = pick(DESCRIPTIONS);
    if (Object.keys(patch).length === 0) return;
    const { error } = await admin.from('ga_company').update(patch).eq('id', c.id);
    if (error) console.error('ga_company update error', c.id, error.message);
    else enrichedCount++;
  });
  console.log(`   ${enrichedCount}개 보강 (나머지는 이미 채워져 있어 건너뜀)`);

  // -------------------------------------------------------
  // 2. 지점 - slug가 결정적(deterministic)이고 unique 제약이 있어 그 자체로
  //    idempotent하다. 이미 있는 slug는 건드리지 않고 없는 것만 만든다.
  // -------------------------------------------------------
  console.log('2) 지점 생성 (목표: 회사당 3개, 총 ' + companies.length * BRANCHES_PER_COMPANY + '개)...');
  const { data: existingBranchRows } = await admin.from('ga_branch').select('id, slug');
  const slugToId = new Map(existingBranchRows.map((b) => [b.slug, b.id]));

  const targetBranchSlugs = [];
  const branchInsertRows = [];
  for (const c of companies) {
    for (let i = 1; i <= BRANCHES_PER_COMPANY; i++) {
      const slug = `${c.slug}-seed-b${i}`;
      targetBranchSlugs.push(slug);
      if (slugToId.has(slug)) continue;
      const city = pick(CITIES);
      branchInsertRows.push({
        ga_company_id: c.id,
        region_id: cityRegionId(city),
        slug,
        name: `${c.name} ${city.label}지점`,
        address: `${city.label} ${pick(STREETS)} ${rnd(200) + 1}, ${rnd(20) + 2}층`,
        lat: city.lat + (Math.random() - 0.5) * 0.02,
        lng: city.lng + (Math.random() - 0.5) * 0.02,
        intro_text: '고객의 든든한 보험 파트너가 되겠습니다. 다양한 상품 비교와 맞춤 설계를 제공합니다.',
        education_info: '체계적인 신인 교육 프로그램과 정기 세미나를 운영합니다.',
        welfare_info: '4대보험, 경조사 지원, 우수사원 시상 등 복지제도를 갖추고 있습니다.',
        db_support_info: 'DB 지원 및 리드 배분 시스템을 운영합니다.',
        settlement_support_info: '정착지원금과 인센티브 제도를 운영합니다.',
        atmosphere_info: '자유롭고 활기찬 분위기에서 함께 성장합니다.',
        planner_count: rnd(76) + 5,
        parking_available: Math.random() < 0.7,
        visit_consult_available: Math.random() < 0.8,
        business_hours: '평일 09:00~18:00',
        tagline: pick(TAGLINES),
        new_recruit_training: Math.random() < 0.6,
        experienced_hire: Math.random() < 0.5,
        db_support: Math.random() < 0.6,
        settlement_support: Math.random() < 0.5,
        operation_type: 'branch',
        status: 'visible',
        registration_status: 'approved',
        organic_view_count: rnd(2950) + 50,
        contact_click_count: rnd(200),
      });
    }
  }
  await inBatches(branchInsertRows, 25, async (row) => {
    const { data, error } = await admin.from('ga_branch').insert(row).select('id').single();
    if (error) {
      console.error('branch insert error', row.slug, error.message);
      return;
    }
    slugToId.set(row.slug, data.id);
  });
  const allBranchIds = targetBranchSlugs.map((s) => slugToId.get(s)).filter(Boolean);
  summary.branches = allBranchIds.length;
  console.log(`   지점 ${allBranchIds.length}/${targetBranchSlugs.length}개 확보 (신규 ${branchInsertRows.length}개 생성)`);

  console.log('   지점 사진 생성 (이미 사진이 있는 지점은 건너뜀)...');
  const { data: existingMediaRows } = await admin.from('branch_media').select('branch_id');
  const branchesWithMedia = new Set(existingMediaRows.map((m) => m.branch_id));
  const mediaRows = [];
  for (const branchId of allBranchIds) {
    if (branchesWithMedia.has(branchId)) continue;
    mediaRows.push({ branch_id: branchId, media_type: 'image_main', source: 'external', value: `https://picsum.photos/seed/${branchId}-main/800/600`, sort_order: 0 });
    for (let g = 1; g <= 4; g++) {
      mediaRows.push({ branch_id: branchId, media_type: 'image_office', source: 'external', value: `https://picsum.photos/seed/${branchId}-${g}/800/600`, sort_order: g });
    }
  }
  await inBatches(mediaRows, 100, async (row) => {
    const { error } = await admin.from('branch_media').insert(row);
    if (error) console.error('branch_media insert error', error.message);
  });
  console.log(`   사진 ${mediaRows.length}장 생성 (${branchesWithMedia.size}개 지점은 이미 있어 건너뜀)`);

  // -------------------------------------------------------
  // 3. 설계사 300명 - 이메일이 결정적 키. public.users에 이미 있으면
  //    auth 계정 생성부터 건너뛴다(진짜 중복 방지는 auth 이메일 유니크가 보장).
  // -------------------------------------------------------
  console.log('3) 설계사 300명 확보...');
  const { data: existingPlannerUsers } = await admin.from('users').select('id, email').ilike('email', 'seed-planner-%');
  const plannerEmailToUserId = new Map(existingPlannerUsers.map((u) => [u.email, u.id]));

  const { data: existingProfilesAll } = await admin.from('planner_profiles').select('id, user_id');
  const userIdToProfileId = new Map(existingProfilesAll.map((p) => [p.user_id, p.id]));

  const plannerUserIds = [];
  let newPlannerCount = 0;
  await inBatches(Array.from({ length: PLANNER_COUNT_TARGET }, (_, i) => i + 1), 8, async (i) => {
    const email = `seed-planner-${String(i).padStart(4, '0')}@example.invalid`;
    let userId = plannerEmailToUserId.get(email);

    if (!userId) {
      const authUserId = await ensureAuthUser(email);
      if (!authUserId) return;
      const name = randomName();
      const { data: userRow, error: userErr } = await admin
        .from('users')
        .upsert(
          { auth_user_id: authUserId, email, nickname: name, provider: 'email', approval_status: 'approved', email_verified_at: new Date().toISOString() },
          { onConflict: 'auth_user_id' }
        )
        .select('id')
        .single();
      if (userErr || !userRow) {
        console.error('public.users insert error', email, userErr?.message);
        return;
      }
      userId = userRow.id;
      newPlannerCount++;
    }
    plannerUserIds.push(userId);

    if (userIdToProfileId.has(userId)) return; // 프로필까지 이미 있으면 여기서 끝

    const activeCity = pick(CITIES);
    const desiredCity = pick(CITIES);
    const desiredGa = pick(companies);
    const name = randomName();
    const { data: plannerRow, error: plannerErr } = await admin
      .from('planner_profiles')
      .insert({
        user_id: userId,
        active_region_id: cityRegionId(activeCity),
        career_years: rnd(20),
        specialties: pickN(SPECIALTIES, rnd(3) + 1),
        self_introduction: pick([
          '고객님의 상황에 맞는 최적의 보장을 찾아드립니다.',
          '꼼꼼한 비교 설계로 후회 없는 선택을 도와드립니다.',
          '어려운 보험 용어도 쉽게 풀어서 설명해드립니다.',
          '가입 후에도 끝까지 책임지는 설계사가 되겠습니다.',
          '고객 한 분 한 분의 이야기에 귀 기울이겠습니다.',
        ]),
        currently_employed: Math.random() < 0.6,
        job_search_status: pick(['actively_looking', 'open_to_offers', 'not_looking']),
        desired_start_timing: pick(['immediate', 'within_1_month', 'within_3_months', 'negotiable']),
        contactable_times: pickN(['morning', 'afternoon', 'evening', 'weekend', 'anytime'], rnd(2) + 1),
        desired_region_id: cityRegionId(desiredCity),
        desired_ga_company_id: desiredGa.id,
        desired_conditions: '좋은 조건이면 이직을 고려하고 있습니다.',
        name,
        phone: `010-${String(rnd(9000) + 1000)}-${String(rnd(9000) + 1000)}`,
        email,
        status: 'approved',
        reviewed_at: daysAgoIso(25),
        consent_contact_paid_view: true,
        consent_recruit_contact: true,
        consent_privacy_policy: true,
        consent_third_party_share: true,
        consent_withdrawal_notice: true,
        consent_agreed_at: daysAgoIso(30),
        created_at: daysAgoIso(30),
      })
      .select('id')
      .single();
    if (plannerErr || !plannerRow) {
      console.error('planner_profiles insert error', email, plannerErr?.message);
      return;
    }
    userIdToProfileId.set(userId, plannerRow.id);

    await admin.from('planner_badges').insert({ planner_profile_id: plannerRow.id, badge_type_code: 'verified_identity', status: 'approved', granted_at: new Date().toISOString() });
    if (Math.random() < 0.15) {
      await admin.from('planner_badges').insert({ planner_profile_id: plannerRow.id, badge_type_code: 'income_verified', status: 'approved', granted_at: new Date().toISOString() });
    }
    const viewCount = rnd(80);
    if (viewCount > 0) {
      await admin.from('planner_profile_views').insert(Array.from({ length: viewCount }, () => ({ planner_profile_id: plannerRow.id, viewed_at: daysAgoIso(30) })));
    }
  });
  summary.planners = plannerUserIds.length;
  console.log(`   설계사 ${plannerUserIds.length}/${PLANNER_COUNT_TARGET}명 확보 (신규 계정 ${newPlannerCount}개)`);

  // -------------------------------------------------------
  // 4. 커뮤니티 익명 작성자 풀 200명 - last_author_name을 결정적 마커로 사용해
  //    이미 만든 계정은 재사용한다.
  // -------------------------------------------------------
  console.log('4) 커뮤니티 작성자 풀 200명 확보...');
  const { data: existingAuthors } = await admin.from('anonymous_profiles').select('id, last_author_name').ilike('last_author_name', 'seed-author-%');
  const markerToProfileId = new Map(existingAuthors.map((a) => [a.last_author_name, a.id]));

  const authorProfileIds = [];
  let newAuthorCount = 0;
  await inBatches(Array.from({ length: AUTHOR_COUNT_TARGET }, (_, i) => i + 1), 8, async (i) => {
    const marker = `seed-author-${String(i).padStart(4, '0')}`;
    let profileId = markerToProfileId.get(marker);
    if (!profileId) {
      const email = `${marker}@example.invalid`;
      const authUserId = await ensureAuthUser(email);
      if (!authUserId) return;
      const { data: profile, error: profErr } = await admin
        .from('anonymous_profiles')
        .upsert({ auth_user_id: authUserId, last_author_name: marker }, { onConflict: 'auth_user_id' })
        .select('id')
        .single();
      if (profErr || !profile) {
        console.error('anonymous_profiles insert error', marker, profErr?.message);
        return;
      }
      profileId = profile.id;
      newAuthorCount++;
    }
    authorProfileIds.push(profileId);
  });
  summary.authors = authorProfileIds.length;
  console.log(`   작성자 ${authorProfileIds.length}/${AUTHOR_COUNT_TARGET}명 확보 (신규 계정 ${newAuthorCount}개)`);

  if (plannerUserIds.length === 0 || authorProfileIds.length === 0) {
    console.error('설계사/작성자 풀 확보에 실패해 이후 단계를 진행할 수 없습니다. 로그를 확인하세요.');
    process.exit(1);
  }

  // -------------------------------------------------------
  // 5. 후기 게시글 - review 카테고리 총 개수가 목표에 못 미치는 만큼만 채운다.
  //    (완전한 콘텐츠 단위 dedup은 불가능해 "카테고리 전체 개수"를 기준으로 삼는다 -
  //    자세한 내용은 README의 idempotency 설명 참고)
  // -------------------------------------------------------
  console.log('5) 후기 게시글 보강...');
  const REVIEW_TEXTS = [
    '설명이 정말 이해하기 쉬웠습니다.', '응답이 빨라 만족했습니다.', '친절하게 상담해주셨어요.',
    '비교설명을 꼼꼼하게 해주셨습니다.', '자동차보험 상담이 최고였습니다.', '재가입도 이분께 할 예정입니다.',
    '실손보험 가입 과정이 정말 편했어요.', '암보험 보장 내용을 자세히 알려주셔서 감사했습니다.',
    '어린이보험 상담 받았는데 너무 친절하셨어요.', '상담 받고 바로 가입했습니다. 믿음이 갔어요.',
    '여러 상품을 비교해주셔서 좋은 선택을 할 수 있었습니다.', '연락이 빠르고 상담이 명쾌했습니다.',
    '설계사님 덕분에 꼭 필요한 보장만 가입했어요.', '전문적인 지식으로 궁금증을 다 해결해주셨습니다.',
    '가입 후 사후관리도 꼼꼼히 해주셔서 좋았습니다.',
  ];
  const reviewCategoryId = categoryId('review');
  const currentReviewCount = await countRows('posts', (q) => q.eq('category_id', reviewCategoryId));
  const reviewToCreate = Math.max(0, REVIEW_TARGET - currentReviewCount);
  const postIds = [];
  if (reviewToCreate > 0) {
    const reviewRows = Array.from({ length: reviewToCreate }, () => {
      const stars = rnd(10) < 7 ? 5 : 4;
      const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
      const branchName = pick(companies).name;
      return {
        category_id: reviewCategoryId,
        author_id: pick(authorProfileIds),
        title: `${starStr} ${branchName} 이용 후기`,
        content: `${starStr}\n${pick(REVIEW_TEXTS)}`,
        author_display_name: randomAuthorName(),
        author_name_type: 'random',
        organic_view_count: rnd(500),
        organic_upvote_count: rnd(80),
        status: 'visible',
        created_at: daysAgoIso(30),
        updated_at: daysAgoIso(30),
      };
    });
    await inBatches(reviewRows, 50, async (row) => {
      const { data, error } = await admin.from('posts').insert(row).select('id').single();
      if (error) {
        console.error('review post insert error', error.message);
        return;
      }
      postIds.push(data.id);
    });
  }
  summary.reviews = currentReviewCount + postIds.length;
  console.log(`   후기 ${summary.reviews}/${REVIEW_TARGET}개 확보 (기존 ${currentReviewCount} + 신규 ${postIds.length})`);
  const reviewPostIds = [...postIds];

  // -------------------------------------------------------
  // 6. 커뮤니티 게시글 - 대상 5개 카테고리 총 개수 기준으로 보강.
  // -------------------------------------------------------
  console.log('6) 커뮤니티 게시글 보강...');
  const COMMUNITY_SLUGS = ['free', 'question', 'info', 'ga_move', 'newcomer'];
  const communityCategoryIds = COMMUNITY_SLUGS.map(categoryId);
  const TITLES = [
    '오늘 첫 계약 성사했습니다!', '신입인데 다들 어떻게 적응하셨나요?', 'GA 이직 고민 중인데 조언 부탁드립니다',
    '실손보험 갱신 관련 질문 있습니다', '요즘 자동차보험 다이렉트 어떤가요?', '이번 달 실적 목표 다들 어떻게 관리하시나요',
    '보험 용어 정리해봤습니다 (공유)', '고객 응대 스크립트 팁 나눠요', '신입 교육 후기 남깁니다',
    '이직 후 정착지원금 관련 문의', '오늘 미팅에서 있었던 일 (하소연)', '암보험 트렌드 변화 아시는 분',
    '태아보험 가입 시기 관련 질문', '법인보험 영업 노하우 공유합니다', '재무설계 자격증 준비하시는 분 계신가요',
    '이번 주 컨퍼런스 다녀오신 분', '설계사 마켓 등록해보신 분 후기 궁금해요', '지점 분위기 좋은 곳 추천해주세요',
    'DB 배분 방식 궁금합니다', '상속증여 상담 케이스 공유',
  ];
  const BODIES = [
    '다들 이런 경험 있으신가요? 의견 부탁드립니다.', '경험 있으신 분들 조언 부탁드려요.',
    '자세한 내용은 댓글로 남겨주시면 감사하겠습니다.', '비슷한 고민 하시는 분 계실까 해서 글 남깁니다.', '도움 되는 정보라 공유해봅니다.',
  ];
  const currentCommunityCount = await countRows('posts', (q) => q.in('category_id', communityCategoryIds));
  const communityToCreate = Math.max(0, COMMUNITY_TARGET - currentCommunityCount);
  const communityIds = [];
  if (communityToCreate > 0) {
    const communityRows = Array.from({ length: communityToCreate }, () => {
      const title = pick(TITLES);
      return {
        category_id: pick(communityCategoryIds),
        author_id: pick(authorProfileIds),
        title,
        content: `${title}\n\n${pick(BODIES)}`,
        author_display_name: randomAuthorName(),
        author_name_type: 'random',
        organic_view_count: rnd(1200),
        organic_upvote_count: rnd(60),
        status: 'visible',
        created_at: daysAgoIso(30),
        updated_at: daysAgoIso(30),
      };
    });
    await inBatches(communityRows, 50, async (row) => {
      const { data, error } = await admin.from('posts').insert(row).select('id').single();
      if (error) {
        console.error('community post insert error', error.message);
        return;
      }
      communityIds.push(data.id);
    });
  }
  summary.posts = currentCommunityCount + communityIds.length;
  console.log(`   커뮤니티 게시글 ${summary.posts}/${COMMUNITY_TARGET}개 확보 (기존 ${currentCommunityCount} + 신규 ${communityIds.length})`);
  postIds.push(...communityIds);

  // 베스트 지정 - 이미 지정된 게시글이 15개 미만일 때만 채운다.
  const currentBestCount = await countRows('posts', (q) => q.eq('best_override_status', 'force_include'));
  if (currentBestCount < 15 && communityIds.length > 0) {
    const bestIds = pickN(communityIds, 15 - currentBestCount);
    await inBatches(bestIds, 15, async (id) => {
      const { error } = await admin.from('posts').update({ best_override_status: 'force_include' }).eq('id', id);
      if (error) console.error('best set error', error.message);
    });
    console.log(`   베스트 게시글 ${bestIds.length}개 신규 지정 (기존 ${currentBestCount}개 포함 총 목표 15개)`);
  }

  // -------------------------------------------------------
  // 7. 댓글 - 전체 댓글 수 기준으로 보강. 대댓글은 이번 실행에서 새로 만든
  //    게시글의 댓글 중에서만 부모를 고른다(재실행 시 과거 댓글까지 다시
  //    조회하지 않기 위한 실용적 선택 - 그래도 전체 대댓글 비율은 충분히 나온다).
  // -------------------------------------------------------
  console.log('7) 댓글 보강...');
  const COMMENT_BODIES = [
    '좋은 정보 감사합니다!', '저도 비슷한 경험 있어요.', '도움이 많이 됐습니다.', '좋은 글 잘 봤습니다.',
    '동의합니다.', '저는 생각이 좀 다른데요.', '추가로 궁금한 점이 있습니다.', '감사합니다 :)',
    '유용한 정보네요.', '응원합니다!', '저도 그렇게 생각해요.', '자세한 설명 감사합니다.',
    '많은 도움 됐어요.', '좋은 하루 되세요.', '공감합니다.',
  ];
  const currentCommentCount = await countRows('comments');
  const commentsToCreate = Math.max(0, COMMENT_TARGET - currentCommentCount);
  const commentPool = postIds.length > 0 ? postIds : reviewPostIds;
  const commentsByPost = new Map();
  let commentCount = 0;
  if (commentsToCreate > 0 && commentPool.length > 0) {
    const commentRows = Array.from({ length: commentsToCreate }, () => {
      const postId = pick(commentPool);
      const existing = commentsByPost.get(postId) ?? [];
      const parentId = existing.length > 0 && Math.random() < 0.2 ? pick(existing) : null;
      return {
        post_id: postId,
        parent_comment_id: parentId,
        author_id: pick(authorProfileIds),
        content: pick(COMMENT_BODIES),
        author_display_name: randomAuthorName(),
        author_name_type: 'random',
        organic_upvote_count: rnd(40),
        organic_downvote_count: rnd(5),
        status: 'visible',
        created_at: daysAgoIso(30),
        updated_at: daysAgoIso(30),
        _postId: postId,
      };
    });
    await inBatches(commentRows, 50, async (row) => {
      const { _postId, ...insertRow } = row;
      const { data, error } = await admin.from('comments').insert(insertRow).select('id').single();
      if (error) {
        console.error('comment insert error', error.message);
        return;
      }
      const list = commentsByPost.get(_postId) ?? [];
      list.push(data.id);
      commentsByPost.set(_postId, list);
      commentCount++;
    });
  }
  summary.comments = currentCommentCount + commentCount;
  console.log(`   댓글 ${summary.comments}/${COMMENT_TARGET}개 확보 (기존 ${currentCommentCount} + 신규 ${commentCount})`);

  if (commentsByPost.size > 0) {
    console.log('   게시글 댓글수 집계 갱신...');
    for (const [postId, ids] of commentsByPost.entries()) {
      const { count } = await admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId).eq('status', 'visible');
      await admin.from('posts').update({ organic_comment_count: count ?? ids.length }).eq('id', postId);
    }
  }

  // -------------------------------------------------------
  // 8. 실시간 채팅 - 전체 개수 기준 보강.
  // -------------------------------------------------------
  console.log('8) 채팅 메시지 보강...');
  const CHAT_BODIES = [
    '안녕하세요', '자동차보험 문의드립니다', '광명시 설계사 추천해주세요', '암보험 질문 있습니다',
    '실손 가입 가능한가요?', '태아보험 상담 가능하신가요?', '수원 쪽 지점 있나요?', '신입인데 상담 가능할까요',
    '보험료 비교 어떻게 하나요', '어린이보험 추천 부탁드려요', '법인보험 상담 가능한가요', '종신보험 궁금합니다',
    '재무설계 상담 받고 싶어요', '상속 관련 질문이 있어요', '은퇴설계 상담 가능할까요', '좋은 정보 감사합니다',
    '네 감사합니다!', '확인해보겠습니다', '언제 상담 가능하신가요', '감사합니다 :)',
  ];
  const currentChatCount = await countRows('chat_messages');
  const chatToCreate = Math.max(0, CHAT_TARGET - currentChatCount);
  let chatCount = 0;
  if (chatToCreate > 0) {
    const chatRows = Array.from({ length: chatToCreate }, () => ({
      user_id: pick(plannerUserIds),
      body: pick(CHAT_BODIES),
      created_at: hoursAgoIso(48),
    }));
    await inBatches(chatRows, 50, async (row) => {
      const { error } = await admin.from('chat_messages').insert(row);
      if (error) {
        console.error('chat insert error', error.message);
        return;
      }
      chatCount++;
    });
  }
  summary.chat = currentChatCount + chatCount;
  console.log(`   채팅 ${summary.chat}/${CHAT_TARGET}개 확보 (기존 ${currentChatCount} + 신규 ${chatCount})`);

  // -------------------------------------------------------
  // 9. 배너 20개 - 실제 운영 배너와 구분이 어려워 DB 카운트가 아니라
  //    상태 파일(banners.done)로만 완료 여부를 판단한다.
  // -------------------------------------------------------
  console.log('9) 배너 생성...');
  if (state.banners?.done) {
    summary.banners = state.banners.count ?? BANNER_TARGET;
    console.log(`   이미 생성됨(상태 파일 기준) - 건너뜀. 다시 만들려면 seed/.seed-state.json의 "banners" 항목을 지우세요.`);
  } else {
    const BANNER_SLOTS = {
      메인배너: ['pc_top', 'mobile_top'],
      광고배너: ['pc_left', 'pc_right', 'pc_list_middle', 'mobile_list_middle'],
      이벤트배너: ['pc_detail_bottom', 'mobile_detail_bottom', 'mobile_sticky_bottom'],
    };
    const ADVERTISERS = ['메타리치 GA', '압도 파트너스', '에센셜 금융서비스', '프로 인슈어런스', '비전 GA', '한강 금융파트너스'];
    const LINK_TARGETS = ['/', '/search', '/planner-market', '/planner-market/search', '/community', '/events'];

    const uploadedPaths = [];
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`https://picsum.photos/seed/bohummap-banner-${i}/1200/300`);
      const buf = Buffer.from(await res.arrayBuffer());
      const bannerPath = `seed/banner-${i}.jpg`;
      const { error } = await admin.storage.from('banner-images').upload(bannerPath, buf, { contentType: 'image/jpeg', upsert: true });
      if (error) {
        console.error('banner image upload error', bannerPath, error.message);
        continue;
      }
      uploadedPaths.push(bannerPath);
    }
    console.log(`   배너 이미지 ${uploadedPaths.length}장 업로드 완료`);

    let bannerCount = 0;
    if (uploadedPaths.length > 0) {
      const bannerRows = [];
      let idx = 0;
      for (const [typeLabel, slots] of Object.entries(BANNER_SLOTS)) {
        const perType = typeLabel === '메인배너' ? 6 : typeLabel === '광고배너' ? 8 : 6;
        for (let i = 0; i < perType; i++) {
          idx++;
          bannerRows.push({
            advertiser_name: pick(ADVERTISERS),
            campaign_name: `${typeLabel} 캠페인 ${idx}`,
            pc_image_path: pick(uploadedPaths),
            mobile_image_path: pick(uploadedPaths),
            link_url: `https://bohummap.com${pick(LINK_TARGETS)}`,
            slot: pick(slots),
            start_at: daysAgoIso(20),
            end_at: new Date(Date.now() + 90 * 86400000).toISOString(),
            priority: rnd(10),
            is_active: true,
          });
        }
      }
      await inBatches(bannerRows.slice(0, BANNER_TARGET), 10, async (row) => {
        const { error } = await admin.from('banners').insert(row);
        if (error) {
          console.error('banner insert error', error.message);
          return;
        }
        bannerCount++;
      });
    }
    summary.banners = bannerCount;
    state.banners = { done: true, count: bannerCount };
    saveState(state);
    console.log(`   배너 ${bannerCount}개 생성 완료`);
  }

  // -------------------------------------------------------
  // 10. 북마크(즐겨찾기) - favorites는 (user_id, branch_id) 유니크 제약이 있어
  //     upsert + ignoreDuplicates로 완전히 안전하게 재실행할 수 있다.
  // -------------------------------------------------------
  console.log('10) 북마크(즐겨찾기) 랜덤 생성...');
  if (allBranchIds.length > 0) {
    const favoriteRows = [];
    for (const userId of plannerUserIds) {
      const favCount = rnd(4); // 0~3개
      for (const branchId of pickN(allBranchIds, favCount)) {
        favoriteRows.push({ user_id: userId, branch_id: branchId });
      }
    }
    let favoriteCount = 0;
    await inBatches(favoriteRows, 100, async (row) => {
      const { error } = await admin.from('favorites').upsert(row, { onConflict: 'user_id,branch_id', ignoreDuplicates: true });
      if (error) console.error('favorite upsert error', error.message);
      else favoriteCount++;
    });
    console.log(`   북마크 ${favoriteCount}건 처리(중복은 자동 스킵)`);
  }

  // -------------------------------------------------------
  // 11. 방문 기록 - 오늘 방문자는 "오늘 자정 이후 기록이 없는 작성자"만 추가하고,
  //     히스토리는 전체 개수 기준으로 보강한다.
  // -------------------------------------------------------
  console.log('11) 방문 기록 생성...');
  const todayCount = await countRows('site_visits', (q) => q.gte('created_at', startOfTodayIso()));
  if (todayCount < authorProfileIds.length * 0.6) {
    const { data: todayVisited } = await admin.from('site_visits').select('anonymous_profile_id').gte('created_at', startOfTodayIso());
    const alreadyVisitedToday = new Set((todayVisited ?? []).map((v) => v.anonymous_profile_id));
    const todayVisitRows = authorProfileIds
      .filter((id) => !alreadyVisitedToday.has(id) && Math.random() < 0.6)
      .map((id) => ({ anonymous_profile_id: id, created_at: hoursAgoIso(10) }));
    await inBatches(todayVisitRows, 100, async (row) => {
      const { error } = await admin.from('site_visits').insert(row);
      if (error) console.error('site_visits(today) insert error', error.message);
    });
    console.log(`   오늘 방문 기록 ${todayVisitRows.length}건 추가`);
  } else {
    console.log('   오늘 방문 기록은 이미 충분함 - 건너뜀');
  }

  const HISTORY_TARGET = 1500;
  const currentHistoryCount = await countRows('site_visits', (q) => q.lt('created_at', startOfTodayIso()));
  const historyToCreate = Math.max(0, HISTORY_TARGET - currentHistoryCount);
  if (historyToCreate > 0) {
    const historyVisitRows = Array.from({ length: historyToCreate }, () => ({ anonymous_profile_id: pick(authorProfileIds), created_at: daysAgoIso(30) }));
    await inBatches(historyVisitRows, 100, async (row) => {
      const { error } = await admin.from('site_visits').insert(row);
      if (error) console.error('site_visits(history) insert error', error.message);
    });
    console.log(`   방문 히스토리 ${historyVisitRows.length}건 추가 (기존 ${currentHistoryCount}건)`);
  } else {
    console.log('   방문 히스토리는 이미 충분함 - 건너뜀');
  }

  const elapsedSec = Math.round((Date.now() - START_TIME) / 1000);
  console.log('');
  console.log('==========================');
  console.log('Seed Complete');
  console.log('==========================');
  console.log('');
  console.log(`GA 회사 : ${summary.gaCompanies}`);
  console.log(`지점 : ${summary.branches}`);
  console.log(`설계사 : ${summary.planners}`);
  console.log(`커뮤니티 작성자 : ${summary.authors}`);
  console.log(`게시글 : ${summary.posts}`);
  console.log(`댓글 : ${summary.comments}`);
  console.log(`채팅 : ${summary.chat}`);
  console.log(`후기 : ${summary.reviews}`);
  console.log(`배너 : ${summary.banners}`);
  console.log('');
  console.log(`완료시간 : ${elapsedSec}초`);
}

main().catch((e) => {
  if (e instanceof SeedFatalError) return; // 이미 안내 메시지를 출력하고 종료를 예약했다
  friendlyFatal('시드 스크립트가 실패했습니다', e);
});
