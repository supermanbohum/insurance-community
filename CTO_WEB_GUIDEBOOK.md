# 보험맵 CTO 온보딩 가이드북

> 이 문서는 보험맵 프로젝트에 새로 합류하는 CTO(Claude)가 처음부터 끝까지 읽고 프로젝트를
> 완전히 이해할 수 있도록 작성된 단일 마스터 문서다. 웹 저장소(`C:\Dev\Recovery\insurance-community-backup`)를
> 기준으로 하며, 기존 문서(README.md, APP_DEVELOPER_GUIDE.md, WEB_MASTER_ROADMAP.md,
> docs/payment-review-checklist.md)의 최신 정보를 흡수하고 그 문서들이 놓친 최근 변경사항까지
> 반영했다. 작성일 기준 최신 마이그레이션은 `0060`, 최신 커밋은 `abb9870`이다.

---

## 0. 이 문서를 읽기 전에 알아야 할 것

기존 마스터 문서 2개(`APP_DEVELOPER_GUIDE.md`, `WEB_MASTER_ROADMAP.md`)는 마이그레이션
0045~0053 시점에 멈춰 있다. 실제로는 **0060까지 적용되어 있고**, TOP 설계사 인증 시스템·전국
설계사 연봉 랭킹 같은 신규 기능(아래 8장)이 두 문서 어디에도 기록되지 않은 상태다. 이 문서가
현재 시점의 단일 진실 공급원(source of truth) 역할을 하며, 기존 두 문서는 "더 상세한 하위
참고자료"로만 취급한다(11장 참고).

---

## 1. 보험맵이란 무엇인가

**보험맵(bohummap.com)**은 전국 GA(General Agency, 보험대리점)와 보험설계사를 연결하는
지도 기반 정보 플랫폼이다. 처음에는 "GA가 지점을 등록하고 소비자/설계사가 지도에서 찾아보는"
단방향 디렉토리 서비스로 시작했지만, 점진적으로 다음 세 가지 축으로 확장했다.

1. **정보 플랫폼**: 전국 GA·지점 정보 검색, 지도 탐색, 회사/지역별 필터
2. **양방향 리쿠르팅 플랫폼**: 설계사가 구직 프로필을 등록하면 GA가 열람권을 사서 연락처를
   확인(스트림 A), GA가 지점 광고 상품을 구매해 노출을 높임(스트림 B)
3. **커뮤니티 + 브랜드 인증**: 보험인 커뮤니티, TOP 설계사 인증, 전국 설계사 연봉 랭킹 등
   신뢰·랭킹 기반 콘텐츠로 트래픽과 체류시간을 늘리는 레이어

운영 주체는 "보험슈퍼맨"(대표 신한국, 사업자등록번호 699-01-04079,
`src/lib/config/site.ts`의 `COMPANY_INFO`)이며, 서비스명은 "보험맵"이다. 모바일에서는
별도 저장소(`C:\Dev\insurance-community-mobile`)의 React Native 앱이 이 웹사이트를
WebView로 감싼 하이브리드 앱으로 배포된다 — **네이티브 기능(카메라/푸시/딥링크 등)만 앱이
담당하고, 실제 화면/로직/데이터는 전부 이 웹 저장소가 소스**다.

---

## 2. 프로젝트 히스토리

- **시작**: 커밋 `091629e` "Phase 1 완료 + Phase 2 DB/서버 레이어 작업 중간 커밋" — 지점
  검색/지도부터 시작
- **현재**: 총 157개 커밋, 마이그레이션 60개(`0001`~`0060`)
- 초기 README.md는 "Phase 1(지점 검색) + Phase 2(커뮤니티) 완료, Phase 3~5는 예정"이라고
  서술하지만 이는 완전히 낡은 프레이밍이다 — 채팅, 설계사마켓, 관리자 패널, 결제 스텁,
  TOP설계사 인증, 연봉랭킹까지 전부 이미 구현되어 있다. README.md는 "로컬 최초 셋업 방법"
  용도로만 유효하고, 기능 현황 파악용으로는 신뢰하지 말 것.
- **최근 웨이브(2026-08-06~07, 이 문서 작성 직전)**: "V2 업데이트"라는 이름으로 한 번에
  아래를 구현: 아이디/비밀번호 찾기, 간편로그인(Google) 삭제, 설계사 열람 확인팝업,
  **TOP 설계사 인증 시스템(완전 신규)**, **전국 설계사 연봉 랭킹(완전 신규)**. 커밋
  `8f0a80a`가 이 웨이브의 핵심 커밋이다.

---

## 3. 비즈니스 모델 (수익원)

| 수익원 | 상태 | 근거 테이블/RPC | 비고 |
|---|---|---|---|
| GA·지점 등록비(월 정기구독) | 스텁 결제로 라이브 | `subscriptions`(0025), plan_code `branch_standard`/`branch_early_bird` | 정상가 월 4,900원, 선착순 100개 얼리버드 월 1,900원 |
| 고소득 설계사 부가비(월 정기구독) | **Legacy** — DB/API 유지, 메뉴만 제거 | `subscriptions`, plan_code `planner_addon`, `planner_certifications`(0024/0027) | 신규 UX는 아래 TOP설계사로 대체됐지만 백엔드는 안 건드림. 인당 월 1,900원 |
| 설계사마켓 열람권 | 스텁 결제로 라이브 | `planner_market_credit_purchases`(0036) | 10건 33만원 ~ 100건 300만원(10% 할인). 최소 구매 10건(0050에서 1건 상품 제거) |
| 지점 광고 상품 | 스텁 결제로 라이브(1/7종만 실제 노출 연동) | `branch_ad_products`+`ad_payments`(0037) | `featured_branch`만 `ga_branch.is_recommended`에 실제 반영, 나머지 6종은 결제 인프라만 |
| TOP 설계사 인증 | **결제 없음** — 무료 인증, 브랜드/신뢰 목적 | `top_designer_certifications`(0056) | 직접 매출원 아님. 향후 유료화 가능성 있는 신규 축 |
| 전국 설계사 연봉 랭킹 | **결제 없음** — 트래픽/바이럴 목적 | `salary_ranking_submissions`(0058) | 직접 매출원 아님 |

**모든 결제는 아직 스텁(`src/lib/payments/stub-provider.ts`)이다.** 실제 PG(토스페이먼츠)
연동은 진행 중이며 `docs/payment-review-checklist.md`에 체크리스트가 있다 — 통신판매업
신고번호와 고객센터 전화번호가 아직 TODO로 비어 있어(`COMPANY_INFO.mailOrderBizNo`,
`COMPANY_INFO.phone`), 이 두 값을 받는 대로 코드에 채워 넣어야 심사가 통과된다.

---

## 4. 시스템 아키텍처

```
[모바일 앱]  React Native WebView 하이브리드 (별도 저장소, 이 문서 범위 밖)
     │  postMessage 브릿지(src/lib/bridge/protocol.ts, src/components/bridge/BoheomBridge.tsx)
     ▼
[웹 저장소]  Next.js 14 App Router (이 저장소) ──▶ Vercel 배포, cron 1개(vercel.json)
     │
     ▼
[Supabase]  Postgres + Auth + Storage + Realtime + pg_cron
```

- **프레임워크**: Next.js 14.2.15(App Router), React 18.3.1, TypeScript 5.5.3
- **DB/Auth/Storage**: Supabase 단일 프로젝트 — 웹과 모바일 앱이 **같은 DB를 공유**한다(앱이
  별도 백엔드를 갖지 않음)
- **배포**: Vercel, `git push` → 자동 배포. cron은 `vercel.json`에 1개(`/api/cron/advance-subscriptions`,
  매일 UTC 18시=KST 03시)만 등록되어 있고, 나머지 주기 작업(15분마다 광고 노출 동기화, 매일
  채팅 아카이빙 등)은 **Postgres 쪽 `pg_cron`**으로 돌아간다(마이그레이션 SQL 안에 등록됨,
  Vercel과 무관)
- **UI**: Tailwind CSS(커스텀 브랜드 팔레트, `brand`/`ink`/`surface` 스케일) + shadcn/ui
  스타일 Radix 프리미티브(`src/components/ui/`)
- **폼**: react-hook-form + zod는 의존성엔 있지만 실제로는 대부분 화면이 수동 `useState` 컨트롤드
  컴포넌트 패턴을 씀(일관성 있게 관찰됨)
- **DB 타입**: `src/types/database.ts`(2,298줄)는 **수동 관리**다 — 파일 자체 주석에 "실제로는
  `supabase gen types typescript`로 자동생성 권장"이라고 적혀 있지만 한 번도 그렇게 전환되지
  않았다. 새 마이그레이션을 만들 때마다 이 파일에 손으로 타입을 추가해야 tsc가 통과한다(이
  세션에서도 마이그레이션마다 직접 추가함). **위험 요소**: 수동 관리이므로 실제 스키마와
  드리프트될 가능성이 항상 있음 — 언젠가 CLI 자동생성으로 전환하는 게 이상적이나, 지금은
  일관된 컨벤션(Tables/Views/Functions 섹션에 손으로 추가)으로 버티고 있다.

---

## 5. 핵심 설계 원칙 (반드시 지켜야 하는 컨벤션)

이 저장소 전체에서 예외 없이 관찰되는 규칙들이다. 새 기능을 설계할 때 아래를 어기면 기존
패턴과 충돌한다.

1. **RLS 기본 거부 + RPC 전용 쓰기**: 민감 테이블은 RLS를 켜고 소유자 전용 SELECT 정책만
   두거나 정책 자체를 안 둔다. 모든 INSERT/UPDATE는 `security definer` RPC로만 한다.
   `public.users`는 `authenticated`로부터 UPDATE 권한 자체가 회수되어 있다(0028).
2. **RPC 3단계 권한 구분** — grant 대상으로만 구분한다:
   - (a) 자가서비스형: 함수 내부에서 `current_member_id()`/`is_full_member()`/
     `is_ga_admin_for_branch()`/`is_owner_of_planner_profile()` 확인, `authenticated`에 grant
   - (b) 관리자 전용형: 함수 내부에서 `current_admin_id()` 확인, 역시 `authenticated`에 grant
     (게이트가 함수 안에 있으므로)
   - (c) 서비스롤 전용형: `authenticated`에 grant하지 않음 — `createAdminClient()`나
     `pg_cron`에서만 호출
3. **공개/비공개 컬럼 분리**: `security_invoker=true` 뷰로 안전한 컬럼만 화이트리스트해서
   노출(`public_planner_profiles`, `public_top_designer_certifications`,
   `public_salary_ranking_submissions` 등 `public_*` 네이밍). 원본 테이블엔 공개 SELECT
   정책이 없다. **주의(0052 버그 사례)**: `security_invoker=true`는 RLS를 우회하지 않는다 —
   뷰 자체에 `grant select to anon, authenticated`를 걸어야 한다.
4. **스토리지 버킷 컨벤션**: 비공개 문서는 `public:false` + 폴더 경로 기반 RLS
   (`(storage.foldername(name))[1]`로 소유자 UUID 매칭), 공개 사진은 `public:true` + SELECT
   정책 없음(URL은 `${SUPABASE_URL}/storage/v1/object/public/<bucket>/...`로 클라이언트가
   직접 구성). 업로드는 "스토리지 업로드 → 경로를 RPC에 전달 → RPC 실패 시
   `createAdminClient()`로 고아 파일 삭제"의 2단계 패턴.
5. **관리자 승인 큐 4파일 패턴** — 새 승인 플로우를 만들 때 항상 이 구조를 그대로 복제한다:
   `src/lib/admin/<feature>.ts`(admin client로 list/count/detail) +
   `src/lib/actions/<feature>-admin.ts`(`requireAdmin()` + RPC 호출 + `revalidatePath`) +
   `src/app/admin/(protected)/<feature>/page.tsx`+`[id]/page.tsx`(대기/전체 탭) +
   `src/components/admin/<Feature>ReviewActions.tsx`(승인=AlertDialog, 반려=Dialog+필수
   Textarea 사유, `useTransition`+`sonner`+`router.refresh()`). 정본 예시:
   `src/lib/admin/ga-change-requests.ts` 세트. 최근에는 승인/보류/반려/재심사
   **4단계**(TOP설계사·연봉랭킹, 6장)로 확장된 변형도 등장했다 — 3+상태가 필요하면 이 변형을
   참고.
6. **독립 시스템 원칙**: 이름이 비슷해 보이는 기능이라도 데이터/RPC/UI를 절대 공유하지 않는다
   (6장 참고). 코드 주석에 "이 시스템은 X와 완전히 별개다"라는 경고가 반복적으로 나오는데,
   실수로 합치지 말라는 뜻이다.
7. **동시성-안전 멱등 처리**: advisory lock 대신 `unique` 제약 + `insert ... on conflict do
   nothing/update returning id`. 크레딧 차감형 RPC(`get_planner_contact`)는 언락 insert와
   차감을 같은 트랜잭션에 넣어 원자성을 보장한다.
8. **더미 데이터/시드**: 실서비스 데이터가 필요하면 `seed/_seed_tmp.mjs`(서비스롤 키로
   ~500개 계정 생성, 멱등적 재실행 가능) 참고. 런타임 코드와 완전히 분리되어 있어 언제든
   삭제 가능.

---

## 6. 4대 독립 축 + 3중 인증 체계

### 4대 독립 축 (절대 서로 재사용하지 않음)

| # | 축 | 정체성 테이블 | 등록 주체 | 비고 |
|---|---|---|---|---|
| 1 | 일반 회원 | `public.users` | 본인(이메일 인증) | `is_full_member()` 게이트 |
| 2 | 설계사마켓 | `planner_profiles`(0034) | 설계사 본인 | 무료 프로필 등록, 연락처는 GA가 크레딧으로 열람 |
| 3 | 지점(GA) 등록 | `ga_branch`, `ga_company`, `ga_admin_users` | GA 파트너 | 즉시반영/재승인 필드 분리 존재 |
| 4 | TOP설계사 인증(구) | `planner_certifications`(0024/0027) | GA 지점관리자가 설계사를 대신 등록 | **Legacy** — 메뉴만 제거, 백엔드 살아있음 |

### 이름이 헷갈리는 "TOP설계사"류 — 실제로는 3(4)개의 별개 시스템

1. `planner_certifications`(0024/0027) — 월 1,900원 구독, **GA 지점관리자가 설계사를 대신
   등록**. `/top-register`, `/partner/planners`, `/admin/planners`. 햄버거 메뉴에서는
   제거했지만 URL 직접 접근·구독·관리자 화면은 그대로 살아있다(Legacy).
2. `planner_badge_types`의 `top_planner`(⭐) 배지 — 설계사마켓 배지 카탈로그(0038/0049)의
   플레이스홀더였던 배지. 0060에서 `is_active=false`+라벨 "TOP 설계사 (Legacy)"로 처리,
   기존에 이미 부여된 배지는 유지하되 신규 발급만 중단.
3. **`top_designer_certifications`(0056/0057)** — 완전 신규, 독립 시스템. 설계사 본인이
   설계사마켓 등록 흐름에서 신청(`planner_profiles.id`만 FK로 재사용), 원천징수영수증
   업로드, 관리자가 별등급(⭐1억~⭐⭐⭐⭐5억, 2026-08-10 4단계로 축소) 부여. `/top-designer`.
4. **`salary_ranking_submissions`(0058/0059)** — 3번과도 완전 분리된 별개 시스템(연봉
   랭킹). `display_name`(공개용 별도 필드)으로 `planner_profiles.name`을 노출하지 않으면서
   금액만 공개. `/salary-ranking`.

**새 기능을 설계할 때 "TOP설계사" 비슷한 이름이 나오면 반드시 이 4개 중 무엇을 가리키는지
먼저 확인할 것** — 이름 재사용이 이 프로젝트에서 가장 흔한 설계 실수 원인이다.

### 3중(실질적으로 4중) 인증 체계

| 체계 | 식별 방법 | 용도 |
|---|---|---|
| 익명 세션 | `src/middleware.ts`가 전 방문자에게 자동 발급(비로그인도 `auth.uid()` non-null) | 탐색 전용, `is_full_member()`는 이걸로 통과 안 됨 |
| 일반 회원 | `current_member_id()`, `is_full_member()`(`provider='email' and email_verified_at is not null and approval_status='approved'`) | 채팅/지점등록/설계사마켓/TOP설계사/연봉랭킹 등 회원 전용 기능 |
| GA 파트너 | `requirePartner()`/`getCurrentPartner()`, `ga_admin_users` 테이블(`auth_user_id`+`is_active=true`) | 지점 관리, 열람권 구매, 광고 구매 |
| 플랫폼 관리자 | `requireAdmin()`, `admin_users` 테이블, `current_admin_id()` | 모든 승인 큐, 결제 관리 |

간편로그인(Google)은 **최근 완전히 삭제**됐다(V2 업데이트) — 현재는 아이디/비밀번호(이메일
인증) 회원가입만 존재한다. 아이디 찾기(`/find-id`, 이메일 OTP)와 비밀번호 찾기
(`/reset-password`, Supabase 표준 `resetPasswordForEmail`)가 새로 추가됐다.

---

## 7. 코드베이스 구조

```
src/
├── app/
│   ├── (main)/          공개 사이트 — best, board, branch, chat, community, contact,
│   │                    delete-account, events, find-id, ga, jobs, login, map, my,
│   │                    planner-market, popular, post, privacy, refund-policy, region,
│   │                    reset-password, salary-ranking, search, signup, terms,
│   │                    top-designer, top-register, write
│   ├── admin/           (protected)/ 전체 관리자 화면 + login/ 별도 관리자 인증
│   ├── api/cron/        Vercel cron 엔드포인트(구독 유예기간 처리)
│   ├── auth/            callback/(OAuth), reset-password-callback/, verified/
│   └── partner/         GA 파트너 포털
├── components/
│   admin, auth, branch, brand, bridge(앱 postMessage), chat, home, layout, legal,
│   map, mypage, partner, planner-market, planners, post, salary-ranking, search,
│   seo, shared, top-designer, ui(shadcn 스타일 프리미티브)
├── lib/
│   actions(서버 액션), ad-products, admin, anon-name, auth, branch, bridge(프로토콜
│   정의), change-requests.ts, chat, config(COMPANY_INFO 등 사이트 상수), design(페이지
│   레이아웃 순서), errors(RPC 에러코드→한글 메시지 맵), geo, map, mock, moderation
│   (금칙어/PII 감지), native, naver-maps, ocr(스텁), partner, payments(PaymentProvider
│   인터페이스+스텁), planner-market, planners, posts, public(공개 조회 전용), search,
│   seo, supabase(client/server/admin 클라이언트 3종), top-designer, user, utils.ts,
│   validation
└── types/
    database.ts(수동 관리, 2,298줄), naver-maps.d.ts
```

`src/lib/supabase/`의 3가지 클라이언트를 반드시 구분해서 쓸 것:
- `client.ts` — 브라우저 클라이언트(`'use client'` 컴포넌트용, anon key)
- `server.ts` — 서버 컴포넌트/액션용, `cookies()`를 읽어 세션 인식(이걸 쓰면 페이지가
  force-dynamic이 됨)
- `admin.ts`(`createAdminClient()`) — 서비스롤 키, RLS 완전 우회. **절대 클라이언트로
  내려보내지 않고 서버 전용 파일에서만 사용**
- `public.ts`(`createPublicSupabaseClient()`) — `cookies()`를 안 읽는 순수 공개 조회
  전용. 캐시 가능한 공개 페이지(홈/검색/지도)에서 사용

---

## 8. 기능 인벤토리 (현재 라이브 상태, 라우트 기준)

**공개(비로그인)**: 홈, 지점 검색/지도/지역별/회사별, 지점 상세, GA 상세, 인기/최신, 커뮤니티
게시판, 공지사항, 리뷰, 채용정보(jobs), 이벤트, **설계사 찾기**(설계사마켓 공개 목록/상세),
**TOP 설계사**(카드그리드/필터/정렬/상세), **전국 설계사 연봉 랭킹**(연도별/명예의전당),
문의하기, 이용약관/개인정보처리방침/환불정책, 데이터 삭제 요청

**회원 전용(이메일 인증 필요)**: 마이페이지, 실시간 채팅(단일 글로벌 룸), 지점 등록,
설계사마켓 등록/수정, **TOP설계사 인증 신청**(설계사마켓 등록폼에 토글 통합 + 독립
`/top-designer/apply`), **연봉랭킹 등록**(`/salary-ranking/apply`, 완전 별도 메뉴),
아이디/비밀번호 찾기

**GA 파트너 전용**: 지점 관리(등록/수정, 즉시반영·재승인 필드 분리), GA 정보 관리, 열람권
구매(설계사마켓), 지점 광고 상품 구매(7종 중 1종만 실제 노출 연동), 변경 이력, 고소득 설계사
(Legacy) 관리

**관리자 전용**: 대시보드(KPI), GA/지점 승인, 변경요청 승인, 설계사마켓 프로필/배지 승인,
열람권 크레딧 관리(수동지급/환불), 광고상품 승인, **TOP설계사 인증 승인(4단계: 승인/보류/
반려/재심사)**, **연봉랭킹 승인(동일 4단계)**, 결제 관리, 문의/채용 관리, 방문자 관리,
커뮤니티 관리(게시글/댓글/신고), 디자인 편집(홈 레이아웃), 이벤트 팝업, 배너 관리, 작업 로그,
고소득설계사(Legacy) 승인

---

## 9. 최근 완성된 대형 기능 (양쪽 마스터 문서 모두 누락)

이 섹션은 `WEB_MASTER_ROADMAP.md`/`APP_DEVELOPER_GUIDE.md`가 반영하지 못한 최신 변경사항이다.

### TOP 설계사 인증 시스템 (`top_designer_*`, 마이그레이션 0056/0057)
- 별등급 4단계(2026-08-10, 10억 제거): ⭐1억 / ⭐⭐2억 / ⭐⭐⭐3억 / ⭐⭐⭐⭐5억
  (`src/lib/top-designer/labels.ts`)
- 관리직(대표/본부장/지점장/단장/센터장/관리자 등) 신청 차단 —
  `is_blocked_designer_job_title()` (기존 `is_blocked_planner_title`과 별개 함수)
- 관리자 심사: 승인/보류/반려/재심사 4단계 — 이 코드베이스 최초의 3+상태 심사 패턴
- AI OCR은 구조만 설계됨(`src/lib/ocr/income-doc-ocr.ts`가 스텁, 항상
  `{incomeKrw:null,...}` 반환) — 관리자가 항상 금액/등급을 직접 확정. 실제 Vision API
  연동은 미래 작업
- 좋아요(로그인 필요, 이 코드베이스 최초의 토글형 추천 기능)/조회수, 명함 다운로드
  (`html2canvas`로 클라이언트 캡처, 본인 로그인 시에만 실명 포함 명함 — 공개 페이지에는
  실명 노출 안 함, `planner_profiles.name`은 여전히 비공개 원칙 유지)

### 전국 설계사 연봉 랭킹 (`salary_ranking_*`, 마이그레이션 0058/0059)
- TOP설계사와 테이블/RPC 완전 분리, "완전 별도 메뉴" 요구사항에 따라 설계사마켓 등록폼과
  연결하지 않고 독립 페이지로만 신청
- `display_name`(자가입력, 실명 아니어도 됨) + `consent_public_display`(전용 단일 동의)로
  `planner_profiles.name`을 공개 노출하지 않으면서 금액만 공개
- 연도별(올해/직전년도) 등록, 순위 리스트, **명예의 전당**(연도별 1위, 별도 테이블 없이
  `distinct on (ranking_year) ... order by annual_income_krw desc`로 파생 조회 —
  과거 행이 삭제되지 않는 한 자연히 영구 보관)

### 로그인 개선
- 간편로그인(Google) 완전 삭제 — `AuthContext.tsx`의 OAuth 코드, WebView 커스텀 스킴
  리다이렉트까지 함께 제거
- 아이디 찾기(`/find-id`) — Supabase 이메일 OTP(`signInWithOtp`→`verifyOtp`)로 이메일
  소유 증명 후 신규 RPC `get_username_by_verified_email()`로 조회, 조회 직후 세션 정리
- 비밀번호 찾기(`/reset-password`) — Supabase 표준 `resetPasswordForEmail`, 전용 콜백
  라우트(`/auth/reset-password-callback`)로 기존 가입확인 콜백(`confirm_email_signup`)
  로직과 절대 섞이지 않게 분리

### 결제/법무 문서 정비 (토스페이먼츠 심사 대비)
- 이용약관에 결제 조항(제14·15조: 결제수단/정기결제/자동결제/해지/결제실패/환불기준/
  청약철회 예외/서비스중단 처리) 신설
- `/refund-policy` 신규 페이지(전자상거래법 기준)
- 개인정보처리방침에 PG 위탁 항목 TODO 반영
- 남은 것: 통신판매업 신고번호, 고객센터 전화번호 (`COMPANY_INFO`에 비어있음), 실제 토스
  SDK 연동, 토스 심사 신청 — `docs/payment-review-checklist.md` 참고

---

## 10. 알려진 갭 / 기술부채

1. **`WEB_MASTER_ROADMAP.md`, `APP_DEVELOPER_GUIDE.md`가 마이그레이션 0045~0053 시점에서
   멈춰 있음** — 이 문서(CTO_WEB_GUIDEBOOK.md)가 최신이지만, 세부 기술 내용(스토리지 버킷
   9종 전체 표, 브릿지 프로토콜 상세, 앱-웹 딥링크 불일치 표 등)은 여전히 그 두 문서에만
   있다. 다음에 대형 기능을 추가하면 최소한 이 가이드북은 갱신할 것.
2. **`database.ts`가 수동 관리** — 스키마 드리프트 위험 상시 존재(4장 참고)
3. **토스페이먼츠 미완료** — 통신판매업 신고번호/CS 전화번호 TODO, 실 SDK 미연동,
   `PaymentProvider`는 전부 스텁
4. **Google Search Console 미인증**(네이버는 완료) — `.env.example`에 관련 env var 문서화도
   누락(실제로는 Vercel에 등록되어 있다고 두 마스터 문서가 언급하지만 예시 파일엔 없음 —
   문서 드리프트)
5. **지점 광고 상품 7종 중 1종(`featured_branch`)만 실제 노출 로직 연동**, 나머지 6종은
   결제/승인 인프라만 있고 실제 배너 슬롯 등은 미구현
6. **AI OCR 미연동** — TOP설계사/연봉랭킹 모두 구조만 있고 실제 인식은 관리자 수동 확인으로
   대체 중
7. **README.md의 "Phase" 프레이밍이 완전히 낡음** — 로컬 셋업 절차 외의 내용은 신뢰하지 말 것
8. **모바일 앱 쪽 딥링크 불일치**(`WEB_MASTER_ROADMAP.md` 표 참고) — 예: 앱이
   `boheommap://designer/{id}`를 가정하지만 실제 라우트는 `/planner-market/{plannerId}`.
   앱-웹 협업 시 반드시 확인.

---

## 11. 참고 문서 지도 — 언제 무엇을 봐야 하는가

| 문서 | 언제 참고 | 신뢰도 |
|---|---|---|
| **이 문서(CTO_WEB_GUIDEBOOK.md)** | 전체 그림, 최신 기능, 설계 원칙 | 최신(0060 기준) |
| `APP_DEVELOPER_GUIDE.md` | 스토리지 버킷 9종 전체 표, 관리자 라우트 전체 표, 마이그레이션 0001~0053 한 줄 요약, "앱 개발자가 알아야 할 것" 10가지 | 0053까지, 그 이후 미반영 |
| `WEB_MASTER_ROADMAP.md` | 앱-웹 딥링크 불일치 표, "절대 안 바꾸는 9가지 규칙", 브릿지 메시지 계약, 네이티브 기능 분담표 | 0053까지, 그 이후 미반영 |
| `docs/payment-review-checklist.md` | 토스페이먼츠 심사 준비 현황 | 최신 |
| `seed/README.md` | 더미 데이터 시드 스크립트 사용법 | 최신, 런타임과 무관 |
| `README.md` | 로컬 최초 셋업(`npm install`~마이그레이션 0001-0005~Vercel 배포)만 | 셋업 절차만 유효, 기능 현황은 낡음 |

모바일 앱 관련 상세(브릿지 프로토콜 전체, 네이티브 기능 목록)는 이 저장소 밖,
`C:\Dev\insurance-community-mobile` 저장소의 문서(`BRIDGE_PROTOCOL.md` 등)를 봐야 한다 —
이 웹 저장소의 담당 범위가 아니다.

---

## 12. 협업 구조

- **웹 Claude(이 세션)**: `C:\Dev\Recovery\insurance-community-backup` 전담. 모바일 앱 UI는
  절대 수정하지 않는다.
- **모바일 Claude**: `C:\Dev\insurance-community-mobile` 전담(하이브리드 WebView 앱
  아키텍처). 웹 저장소는 절대 수정하지 않는다.
- **DB 변경 워크플로**: 웹 Claude가 마이그레이션 SQL을 작성하면, 사용자가 Supabase SQL
  에디터에 직접 붙여넣어 실행한다(Claude가 DB에 직접 쓰기 실행 권한 없음) — 이 순서를
  반드시 지킬 것.
- **이미 만든 마이그레이션 파일을 고쳐도 되는가**(2026-08-11 확정): **적용 여부로 갈린다.**
  고치기 전에 `pg_proc`·`information_schema`·`pg_constraint`로 **운영 DB에 적용됐는지
  직접 조회**하고 판단한다.

  | 상태 | 처리 |
  |---|---|
  | 아직 적용 안 됨 | **그 파일을 고친다.** 새 번호로 쪼개지 않는다 |
  | 이미 적용됨 | **절대 고치지 않는다.** 새 번호로 만든다 |

  🔴 "기존 마이그레이션 수정 금지"는 **적용된 것과 파일이 어긋나는 상태를 막는 규칙**이지,
  한 번도 실행된 적 없는 파일까지 묶는 규칙이 아니다. 미적용 파일을 굳이 새 번호로 쪼개면
  **한 번도 실행된 적 없는 중간판이 이력에 남아**, 나중에 새 환경에 순서대로 적용할 때
  그 잘못된 중간 상태를 통과하게 된다(실제 사례: `0106`이 운영팀 공지까지 익명화하던 중간판.
  미적용을 확인하고 같은 파일을 고쳐 그 상태가 이력에 남지 않았다).

  파일을 고쳤다면 **헤더에 "커밋 후 수정했고, 수정 시점에 미적용임을 무엇으로 확인했는지"를
  적는다.**
- **배포 워크플로**: 코드 변경 → `tsc --noEmit`/`next lint`/`npm run build` 통과 확인 →
  커밋 → `git push` → Vercel 자동 배포 → 운영(bohummap.com)에서 직접 확인. 마이그레이션이
  필요한 기능은 "코드는 배포됐지만 DB 미적용 상태"를 견딜 수 있게 방어적으로 짠다(예:
  `sitemap.ts`가 새 테이블 조회 실패 시 throw 대신 빈 배열 반환 — 마이그레이션 순서와 코드
  배포 순서가 어긋나도 전체 빌드가 깨지지 않게).

---

## 13. CTO가 첫 결정을 내리기 전에 확인해야 할 것

새 CTO가 전략적 판단을 내리기 전에, 아래 질문에 스스로 답할 수 있어야 이 프로젝트를
"완전히 이해했다"고 볼 수 있다.

1. 지금 4개의 "TOP설계사류" 시스템(6장) 중 사용자에게 실제로 어떤 게 보이고 있는가?
   → 답: 구버전은 메뉴에서 숨겨졌지만 URL/구독/관리자화면은 살아있고, 신버전(`top_designer_*`)이
   신규 진입점이다.
2. 새 유료 기능을 만들 때 결제는 스텁인가 실제인가? → 아직 전부 스텁, 토스 연동 진행 중.
3. `database.ts`를 안 고치고 새 테이블/RPC를 쓸 수 있는가? → 없다. 마이그레이션마다 반드시
   손으로 타입을 추가해야 tsc가 통과한다.
4. 앱과 관련된 변경을 할 때 이 저장소만 고치면 되는가? → 화면/로직/데이터는 그렇다. 단
   네이티브 기능(푸시, 카메라, 딥링크 스킴)은 모바일 저장소 쪽 변경이 필요할 수 있다 —
   `WEB_MASTER_ROADMAP.md`의 딥링크 불일치 표를 먼저 확인.
5. 이 문서가 다루지 않는 세부사항(정확한 컬럼명, RLS 정책 전문 등)이 필요하면? → 항상
   `supabase/migrations/`의 실제 SQL 파일을 최종 진실로 삼을 것 — 어떤 문서도 그보다
   우선하지 않는다.
