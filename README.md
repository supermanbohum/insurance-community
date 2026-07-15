# 보험설계사 익명 커뮤니티

보험설계사를 위한 완전 익명 커뮤니티. Next.js App Router + Supabase 기반.

> 현재 상태: **Phase 1 완료** (프로젝트 생성 / Supabase 연결 / 익명 인증 / DB 스키마 / RLS / 기본 레이아웃) +
> **Phase 2 완료** (게시글 목록 / 작성 / 상세 / 수정·삭제 / 이미지 첨부)
> 댓글·추천·베스트·관리자 기능은 Phase 3~5에서 순차적으로 추가됩니다.

## 1. 로컬 실행 방법

```bash
npm install
cp .env.example .env.local   # 값 채워넣기 (아래 3번 참고)
npm run dev
```

`http://localhost:3000` 접속 시 백그라운드에서 자동으로 익명 세션이 생성됩니다. 로그인/회원가입 화면은 없습니다.

## 2. Supabase 프로젝트 설정 방법

1. https://supabase.com 에서 새 프로젝트 생성 (리전: Seoul 권장)
2. 프로젝트 생성 후 **Project Settings > API** 에서 다음 값을 확인:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 공개 저장소에 커밋하지 말 것)

## 3. 익명 인증(Anonymous Auth) 활성화 방법

Supabase 대시보드 > **Authentication > Providers > Anonymous Sign-ins** 에서 **Enable anonymous sign-ins** 를 켭니다.
(기본적으로 꺼져 있으므로 반드시 활성화해야 미들웨어의 `signInAnonymously()` 호출이 성공합니다.)

## 4. SQL 적용 순서

Supabase 대시보드 > **SQL Editor** 에서 아래 파일을 **순서대로** 실행합니다.

1. `supabase/migrations/0001_init_schema.sql` — 테이블/인덱스/타입 생성
2. `supabase/migrations/0002_rls_policies.sql` — RLS 정책, 익명 프로필 자동 생성 트리거, 헬퍼 함수
3. `supabase/migrations/0003_seed_data.sql` — 기본 카테고리(공지사항/보험이슈/자유게시판), 기본 운영 설정값
4. `supabase/migrations/0004_post_write_functions.sql` — 게시글 작성/수정/삭제/조회수 집계용 SECURITY DEFINER 함수
5. `supabase/migrations/0005_storage_post_images.sql` — 게시글 이미지용 Storage 버킷(`post-images`) 생성 + 정책

각 파일은 재실행해도 안전하도록 `if not exists` / `on conflict do nothing`을 사용했습니다.

## 5. 환경변수 (.env.example 참고)

| 변수 | 설명 | 노출 범위 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (RLS로 보호됨) | 공개 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 관리자 키 | **서버 전용, 절대 비공개** |
| `IP_HASH_SECRET` | IP 단방향 해시용 서버 비밀키 | **서버 전용** |
| `ADMIN_BOOTSTRAP_EMAIL` | 최초 super_admin 지정용 이메일 | 서버 전용 |
| `NEXT_PUBLIC_SITE_NAME` | 서비스명 (관리자 설정으로도 override 가능) | 공개 가능 |
| `NEXT_PUBLIC_SITE_URL` | 배포 도메인 (OG 메타데이터용) | 공개 가능 |
| `NEXT_PUBLIC_APP_ENV` | development/staging/production | 공개 가능 |
| `ENABLE_DEMO_METRICS` | 개발/스테이징 전용 데모 표시 수치 스위치. production에서는 코드에서 강제 무시 | 서버 전용 |

## 6. Vercel 배포 방법

1. GitHub 저장소 연결 후 Vercel에서 Import
2. Vercel 프로젝트 > Settings > Environment Variables에 위 표의 값 등록
   (`SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SECRET`은 Production/Preview 모두 등록하되 팀원 접근 권한 최소화)
3. `NEXT_PUBLIC_APP_ENV=production`, `ENABLE_DEMO_METRICS=false` 로 설정
4. Deploy

## 7. 관리자 생성 방법 (Phase 4에서 관리자 로그인 화면과 함께 상세 가이드 제공 예정)

Phase 1 기준으로는 관리자 화면이 아직 없으므로, 다음 방식으로 최초 super_admin을 준비합니다.

1. Supabase Authentication에서 이메일/비밀번호로 관리자 계정 생성 (일반 익명 인증과 별개)
2. SQL Editor에서 아래 실행 (생성한 auth 계정의 UUID와 이메일로 교체):

```sql
insert into public.admin_users (auth_user_id, email, display_name, role, can_adjust_metrics, can_override_best, can_edit_author_name, can_change_created_at, can_pin_posts)
values ('<auth.users.id>', 'admin@example.com', '보험슈퍼맨', 'super_admin', true, true, true, true, true);
```

Phase 4에서 `/admin/login` 화면과 관리자 계정 관리 UI가 추가되면 이 과정은 화면에서 처리됩니다.

## 8. 배너 등록 방법 (Phase 5에서 관리자 UI 제공 예정)

Phase 1 기준으로는 `banners` 테이블에 직접 SQL로 등록해야 합니다. Phase 5에서 관리자 페이지의 배너 관리 화면이 추가되면 UI로 대체됩니다.

## 9. 보안 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 **클라이언트 번들에 절대 포함되지 않도록** 서버 전용 모듈(`src/lib/supabase/admin.ts`, `server-only` import)에서만 사용합니다.
- 사용자의 원본 익명 UUID(`auth_user_id`)는 일반 API 응답이나 화면에 노출하지 않습니다.
- IP 원문은 어디에도 저장하지 않고, 단방향 HMAC 해시(`IP_HASH_SECRET`)만 일시적으로 사용합니다 (관리자도 원본 IP 열람 불가).
- `posts`/`comments`/`reactions` 테이블은 RLS에서 직접 INSERT/UPDATE 정책을 열어두지 않았습니다. 모든 쓰기는 Phase 2~4에서 추가되는 `SECURITY DEFINER` DB 함수 또는 Route Handler를 통해서만 이루어지며, 이를 통해 조회수·추천수 등 민감 수치를 클라이언트가 직접 조작할 수 없도록 원천 차단합니다.
- 관리자의 수치 보정(`imported_*`, `correction_*`)과 운영자 추천(`editor_pick_*`) 변경은 모두 `audit_logs`에 사유와 함께 기록되며, 실제 사용자 반응(`organic_*`, `reactions` 테이블)은 관리자가 직접 생성·수정할 수 없습니다.

## 10. Phase 2: 게시글 이미지(Storage) 설정 및 테스트

### 10.1 Storage 버킷 생성 방법

`0005_storage_post_images.sql` 마이그레이션이 `post-images` 버킷과 업로드/삭제 정책을
SQL만으로 전부 생성합니다. **대시보드에서 버킷을 별도로 만들 필요는 없습니다.**
(4번의 SQL 적용 순서대로 0001~0005를 실행하면 끝)

수동으로 확인하고 싶다면: Supabase 대시보드 > **Storage** 에서 `post-images` 버킷이
public으로 생성되어 있고, 허용 MIME 타입이 `image/jpeg, image/png, image/webp`,
용량 제한이 5MB로 설정되어 있는지 확인합니다.

### 10.2 필요한 환경변수

이미지 업로드 기능을 위해 **새로 추가되는 환경변수는 없습니다.** 기존
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`만으로 동작합니다.

### 10.3 업로드 테스트 방법

1. `npm run dev` 로 로컬 서버 실행
2. `/write`에서 카테고리 선택 후 제목/본문 입력, 이미지 1~5장 첨부 후 "작성 완료"
3. 정상 작성되면 `/post/{id}`로 이동하며 첨부한 이미지가 표시되는지 확인
4. Supabase 대시보드 > Storage > `post-images` 버킷에서 `{postId}/{uuid}.{ext}` 경로로
   파일이 실제로 업로드되었는지 확인
5. 이미지 6장 이상 첨부를 시도하면 클라이언트 단에서 "최대 5장" 안내와 함께 초과분이 거부되는지 확인

### 10.4 업로드 실패 / 삭제 테스트 방법

1. **실패 롤백 확인**: 네트워크를 끊거나 매우 큰 파일(허용 용량 초과)을 억지로 업로드해 실패를
   유도한 뒤, 글이 목록에 노출되지 않고(작성 자체가 취소됨) Storage에도 파일이 남지 않는지 확인
   (내부적으로 `create_post`가 `status='hidden'`으로 생성 → 이미지 처리 실패 시 `delete_post_hard`로
   게시글/이미지 행과 Storage 객체를 함께 정리합니다)
2. **본인 글 삭제 확인**: `/post/{id}`에서 본인 글의 "삭제" 버튼 클릭 → 목록에서 사라지고,
   Storage 대시보드에서 해당 `post-images/{postId}/` 하위 파일이 삭제되었는지 확인
3. **권한 확인**: 다른 브라우저(또는 시크릿 모드 - 별도의 익명 세션)로 타인의 글 URL에
   `/edit`로 접근 시 상세 페이지로 리다이렉트되는지 확인

## 폴더 구조

```
src/
  app/                # 라우트 (App Router)
  components/         # UI 컴포넌트
  lib/
    supabase/          # client / server / admin(service role) 클라이언트
    config/            # 사이트 브랜딩, 기본 운영 설정 상수
    security/          # IP 해시 등
    moderation/        # 금지어/개인정보 패턴 감지
    anon-name/         # 랜덤 익명명 생성
    validation/        # 게시글 폼 zod 스키마, 이미지 검증
    errors/            # RPC 예외 코드 -> 한국어 메시지 매핑
    posts/             # 게시글 목록/상세 조회, 표시값 포맷
    actions/           # 게시글 작성/수정/삭제 서버 액션
  types/               # DB 타입
supabase/migrations/   # SQL 마이그레이션 (순서대로 실행)
```
