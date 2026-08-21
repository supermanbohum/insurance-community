-- 0114 · 운영진 강제 승인 — 필수 서류·사진이 없어도 승인되게 한다
--
-- 오너 지시(2026-08-21): 「내가 아는 사람들이라 필수서류가 없더라도
--                        그냥 운영진이 승인한 건 통과되게 해줘」
--
-- 배경: review_branch_registration은 request_type='create' 승인 시 네 가지를 막는다.
--       ① business_card_path 없음   → MISSING_REQUIRED_DOCUMENTS
--       ② image_main 없음           → MISSING_MAIN_PHOTO
--       ③ image_office 5장 미만     → MISSING_OFFICE_PHOTOS
--       ④ intro_text 50자 미만      → INTRO_TEXT_TOO_SHORT
--       실제로 「송파사무실」이 ②에 걸려 승인 버튼이 실패하고 있었다(2026-08-21 확인).
--
-- 🔴 기존 함수를 고치지 않는다. 인자를 하나 추가하면 인자 개수가 다른 함수가 하나 더 생겨
--    PostgREST가 후보를 못 고른다(0108에서 실제로 겪은 사고다).
--    그래서 **이름이 다른 전용 RPC**를 새로 만든다. 기본 승인 경로의 검사는 그대로 남는다.
--
-- 🔴 「강제 승인이었다」는 사실을 지운 채 통과시키지 않는다.
--    review_reason에 표시를 남기고 감사 로그에도 어떤 항목이 비어 있었는지 적는다.
--    나중에 「왜 사진 없는 지점이 공개돼 있나」를 묻게 될 때 답할 수 있어야 한다.

create or replace function public.force_approve_branch_registration(
  p_registration_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_reg     public.branch_registrations;
  v_company public.ga_company;
  v_missing jsonb;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if v_reg.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  -- 수정 요청(update)은 애초에 서류 검사가 없다. 기본 승인 경로를 쓰면 된다.
  -- 여기로 들어오면 호출부가 잘못된 것이므로 조용히 통과시키지 않고 막는다.
  if v_reg.request_type <> 'create' then
    raise exception 'NOT_CREATE_REQUEST';
  end if;

  -- 검사를 건너뛰되, 무엇이 비어 있었는지는 남긴다
  select jsonb_build_object(
    'business_card', v_reg.business_card_path is null,
    'image_main',    not exists (select 1 from public.branch_media m
                                 where m.branch_id = v_reg.branch_id and m.media_type = 'image_main'),
    'image_office',  (select count(*) from public.branch_media m
                      where m.branch_id = v_reg.branch_id and m.media_type = 'image_office'),
    'intro_len',     (select coalesce(length(trim(intro_text)), 0)
                      from public.ga_branch where id = v_reg.branch_id)
  ) into v_missing;

  select * into v_company from public.ga_company where id = v_reg.ga_company_id;

  -- 기본 승인 경로와 같은 결과를 만든다: GA가 승인된 회사여야 실제로 공개된다
  update public.ga_branch
  set registration_status = 'approved',
      status = case when v_company.approval_status = 'approved' then 'visible' else 'hidden' end,
      status_reason = null
  where id = v_reg.branch_id;

  update public.branch_registrations
  set status = 'approved',
      reviewed_by_admin_id = public.current_admin_id(),
      reviewed_at = now(),
      review_reason = '[운영진 강제 승인] ' || coalesce(nullif(trim(coalesce(p_reason, '')), ''), '필수 항목 미비 상태로 승인'),
      updated_at = now()
  where id = p_registration_id;

  perform public._write_ga_audit_log(
    'branch_registrations', p_registration_id, 'force_approve',
    null,
    jsonb_build_object('branch_id', v_reg.branch_id, 'missing', v_missing, 'reason', p_reason)
  );
end;
$function$;

-- 권한: 익명은 부를 수 없게 한다. 기본 승인 RPC는 anon=X가 남아 있지만(Supabase가 생성 시
-- 직접 부여한다) 새로 만드는 것까지 그럴 이유는 없다. 롤을 직접 적어야 실제로 빠진다.
revoke execute on function public.force_approve_branch_registration(uuid, text) from public, anon;
grant  execute on function public.force_approve_branch_registration(uuid, text) to authenticated;
