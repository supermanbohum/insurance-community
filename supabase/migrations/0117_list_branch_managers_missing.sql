-- 0117 · 0115에서 빠진 list_branch_managers 를 복구한다
--
-- 🔴 사고(2026-08-27): 컴패니언 담당자가 사무실 사진을 저장하다
--    「일시적인 오류가 발생했습니다」를 반복해서 맞았다.
--    edge_logs 실측: 10:19:10 KST  `POST | 404 | /rest/v1/rpc/list_branch_managers`
--    (사용자가 보낸 스크린샷 시각 10:19와 초 단위로 일치)
--
-- 원인 — **내가 옮겨 적으면서 빠뜨렸다.**
--    저장소의 0115 파일에는 이 함수가 있는데, 오너가 복붙할 수 있게
--    채팅으로 압축본을 만들면서 이 함수만 누락했다. 운영에는 들어가지 않았다.
--    파트너 지점 편집 페이지가 열릴 때마다 이 RPC를 부르므로 매번 404가 났다.
--
-- 👉 **교훈: 마이그레이션을 채팅용으로 다시 타이핑하지 마라.**
--    파일을 그대로 주거나, 준 다음 `pg_proc`으로 **함수 개수를 대조**한다.
--    「적용했다」는 실행 성공이 아니라 **정의가 다 들어갔는지**로 판정한다.

create or replace function public.list_branch_managers(p_branch_id uuid)
returns table (ga_admin_user_id uuid, email text, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.id, a.email, a.display_name, m.created_at
  from public.ga_branch_admins m
  join public.ga_admin_users a on a.id = m.ga_admin_user_id
  where m.branch_id = p_branch_id
    and (public.current_admin_id() is not null or public.is_ga_admin_for_branch(p_branch_id))
  order by m.created_at;
$function$;

-- RLS 정책이 이 함수를 호출하지 않는 것을 pg_policies 로 확인한 뒤 좁힌다.
revoke execute on function public.list_branch_managers(uuid) from public, anon;
grant  execute on function public.list_branch_managers(uuid) to authenticated;
