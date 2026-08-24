-- 0115 · 한 관리자가 여러 지점을 관리할 수 있게 한다
--
-- 사고(2026-08-24): 컴패니언 HQ 담당자가 사무실 사진 등록·대표 연락처 저장에서
--   「접근 권한이 없습니다」 / 「제출하지 못했습니다」를 맞았다.
--
-- 🔴 진짜 원인은 권한이 아니라 **화면 가드와 저장 가드가 서로 다른 것**이었다.
--   페이지 열기  branch.ga_company_id === partner.ga_company_id   → 회사 단위. 열린다
--   저장         is_ga_admin_for_branch(branch_id)                 → 지점 단위. 막힌다
--   그 계정은 ga_admin_users.branch_id 가 「송파사무실」 하나로 고정돼 있어서,
--   같은 회사(메타리치)의 다른 사무실은 **폼은 열리는데 저장만 실패**했다.
--   사용자에게는 「되는 화면인데 버튼이 죽은 것」으로 보인다. 가장 나쁜 형태다.
--
-- 왜 이 방법인가 — 다른 후보를 버린 이유
--   ① ga_admin_users.branch_id 를 null 로 바꾼다(회사 전체 관리자로 승격)
--      → 한 줄이면 끝나지만 **맵그룹 1본부·3본부·오송·포항까지 편집 가능**해진다.
--        그 지점들은 다른 지점장 것이다. 권한을 필요 이상으로 넓히지 않는다
--   ② 화면 가드를 저장 가드에 맞춘다(못 여는 지점은 404)
--      → 모호한 에러는 사라지지만 **일을 못 하게 만드는 것**이라 해결이 아니다
--   ③ 컴패니언을 별도 ga_company 로 분리한다
--      → 모델링은 이게 가장 정확할 수 있으나 공개 화면의 GA 표기·「다른 지점」 목록·
--        GA 개수가 전부 바뀐다. **제품 판단이라 오너 몫이다.** 여기서 결정하지 않는다

create table if not exists public.ga_branch_admins (
  ga_admin_user_id uuid not null references public.ga_admin_users(id) on delete cascade,
  branch_id        uuid not null references public.ga_branch(id)      on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (ga_admin_user_id, branch_id)
);

create index if not exists ga_branch_admins_branch_idx on public.ga_branch_admins (branch_id);

-- 이 표는 SECURITY DEFINER 함수를 통해서만 읽힌다. 클라이언트에 직접 열지 않는다.
alter table public.ga_branch_admins enable row level security;

-- 🔴 인자·이름이 그대로다. create or replace 가 기존 함수를 **대체**한다.
--    인자 개수를 바꾸면 함수가 하나 더 생겨 PostgREST 가 후보를 못 고른다(0108).
create or replace function public.is_ga_admin_for_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.ga_admin_users ga
    join public.ga_branch b on b.id = p_branch_id
    where ga.auth_user_id = auth.uid()
      and ga.is_active = true
      and (
        -- 기존 규칙 두 개는 그대로 둔다
        ga.branch_id = p_branch_id
        or (ga.branch_id is null and ga.ga_company_id = b.ga_company_id)
        -- 새 규칙: 명시적으로 위임된 지점
        or exists (
          select 1 from public.ga_branch_admins m
          where m.ga_admin_user_id = ga.id and m.branch_id = p_branch_id
        )
      )
  );
$function$;

-- 서버 액션이 자기 나름의 검사를 따로 하지 않고 이 판정을 그대로 쓰게 한다.
-- (지금은 partner.ts 가 `partner.branch_id !== branchId` 를 직접 비교해서
--  위임 지점을 모른 채 막고 있었다 — 판정이 두 군데면 반드시 어긋난다)
revoke execute on function public.is_ga_admin_for_branch(uuid) from public, anon;
grant  execute on function public.is_ga_admin_for_branch(uuid) to authenticated;
