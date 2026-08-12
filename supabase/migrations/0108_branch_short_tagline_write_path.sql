-- =========================================================
-- 0108_branch_short_tagline_write_path.sql
-- 「짧은 소개」(0107 컬럼)를 실제로 저장할 수 있게 하는 쓰기 경로.
--
-- 🔴 0107은 컬럼만 만들었다. 그 상태에서는 **어떤 화면에서도 값을 넣을 수 없다** -
-- 지점 쓰기는 전부 RPC를 거치는데(RPC-only), short_tagline을 받는 RPC가 하나도 없다.
-- 확인 방법: pg_get_functiondef를 'tagline'으로 훑어 6개 함수를 뽑고, 그중
-- short_tagline을 언급하는 함수가 0개임을 확인했다(추측 아님).
--
-- ---------------------------------------------------------
-- 왜 기존 함수에 파라미터를 추가하지 않았나
-- ---------------------------------------------------------
-- submit_branch_registration 등에 `p_short_tagline`을 덧붙이면 create or replace가
-- **새 시그니처의 함수를 하나 더 만들고 옛 함수를 남긴다**(파라미터 개수가 다르면
-- 다른 함수다). 그러면 두 가지가 동시에 나빠진다:
--
--   1. 옛 인자 집합만 보내는 호출은 옛 함수와 새 함수 **둘 다에 매칭**된다
--      (새 함수의 나머지 인자는 default가 있으므로). PostgREST가 후보를 못 고른다.
--   2. 옛 함수를 drop하면, SQL을 적용한 순간부터 새 프론트가 배포되기 전까지
--      **운영 등록 폼이 죽는다**(없는 함수 호출 → PGRST202).
--
-- 실제로 register_branch_for_partner / update_partner_branch는 이미 이 방식으로
-- 중복 시그니처가 2개씩 남아 있다(운영 확인함). 지금은 앱이 그 둘을 호출하지 않아
-- 사고가 안 났을 뿐이다. 같은 함정을 하나 더 파지 않는다.
--
-- 그래서 **필드 하나만 쓰는 전용 RPC**를 새로 만든다. 기존 시그니처를 건드리지 않으므로
-- 이 마이그레이션은 언제 적용해도 배포 중인 코드를 깨뜨리지 않는다(적용 순서 무관).
--
-- ---------------------------------------------------------
-- 🔴 검열 경로를 우회하지 않는다
-- ---------------------------------------------------------
-- short_tagline은 **공개 카드에 그대로 노출되는 자유 입력 텍스트**다. 파트너가 아무 때나
-- 즉시 바꿀 수 있으면 심사 없는 공개 문구 칸이 생긴다. 그래서 GA 담당자에게는
-- **아직 심사 전인 지점(registration_status='pending')에서만** 허용한다 - 그 지점은
-- 어차피 status='hidden'이라 관리자가 승인해야 공개된다.
--
-- 이미 승인된 지점의 문구 변경은 기존 수정 경로(submit_branch_update → 승인 큐 →
-- review_branch_registration)를 그대로 탄다. 아래에서 review_branch_registration이
-- payload의 shortTagline을 반영하도록 함께 고친다.
--
-- 운영팀(플랫폼 관리자)은 제한 없이 수정할 수 있다 - 심사하는 쪽이기 때문이다.
-- =========================================================

-- ---------------------------------------------------------
-- 1) 전용 쓰기 RPC
-- ---------------------------------------------------------
create or replace function public.set_branch_short_tagline(
  p_branch_id uuid,
  p_short_tagline text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_value text;
  v_registration_status text;
  v_is_platform_admin boolean;
begin
  -- 빈 문자열/공백만 들어오면 "없음"으로 저장한다. 0107 제약이 공백-only를 거부하므로
  -- 여기서 정규화하지 않으면 사용자가 지우려고 공백을 넣었을 때 에러가 난다.
  v_value := nullif(btrim(coalesce(p_short_tagline, '')), '');

  -- 상한은 0107 제약이 최종 판정하지만, 여기서 먼저 걸러야 호출부가 원인을 알 수 있다
  -- (제약 위반은 23514로 올라와서 어느 필드인지 구분이 안 된다).
  if v_value is not null and char_length(v_value) > 9 then
    raise exception 'SHORT_TAGLINE_TOO_LONG';
  end if;

  v_is_platform_admin := public.current_admin_id() is not null;

  if not v_is_platform_admin then
    if not public.is_ga_admin_for_branch(p_branch_id) then
      raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
    end if;

    select registration_status into v_registration_status
    from public.ga_branch where id = p_branch_id;

    if v_registration_status is null then
      raise exception 'BRANCH_NOT_FOUND';
    end if;

    -- 심사가 끝난 지점은 수정 요청(승인 큐)을 거쳐야 한다.
    if v_registration_status <> 'pending' then
      raise exception 'REQUIRES_REVIEW';
    end if;
  end if;

  update public.ga_branch
  set short_tagline = v_value
  where id = p_branch_id;

  if not found then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.set_branch_short_tagline(uuid, text) from public;
grant execute on function public.set_branch_short_tagline(uuid, text) to authenticated;

comment on function public.set_branch_short_tagline(uuid, text) is
  '지점 「짧은 소개」 단독 저장. GA 담당자는 심사 전(registration_status=pending) 지점만, '
  '플랫폼 관리자는 제한 없이. 승인된 지점의 변경은 submit_branch_update 승인 큐를 탄다.';

-- ---------------------------------------------------------
-- 2) 수정 승인 시 payload의 shortTagline 반영
-- ---------------------------------------------------------
-- ⚠️ 기존 tagline은 `coalesce(v_payload->>'tagline', tagline)`이라 **값을 지울 수 없다**
-- (payload에 없으면 유지, null이어도 유지). short_tagline은 선택 입력이고 "지우고 싶다"가
-- 정상 요구라서, 키가 있으면 그 값을(빈 값이면 null로) 그대로 반영하는 형태로 쓴다.
-- tagline 쪽 동작은 이번 범위가 아니라 건드리지 않는다.
create or replace function public.review_branch_registration(
  p_registration_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reg public.branch_registrations;
  v_company public.ga_company;
  v_payload jsonb;
  v_intro_text text;
begin
  if public.current_admin_id() is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_reg from public.branch_registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;
  if v_reg.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  if p_decision = 'approved' and v_reg.request_type = 'create' then
    -- 임대차계약서는 더 이상 요구하지 않는다. 명함만 필수다.
    if v_reg.business_card_path is null then
      raise exception 'MISSING_REQUIRED_DOCUMENTS';
    end if;
    if not exists (select 1 from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_main') then
      raise exception 'MISSING_MAIN_PHOTO';
    end if;
    if (select count(*) from public.branch_media where branch_id = v_reg.branch_id and media_type = 'image_office') < 5 then
      raise exception 'MISSING_OFFICE_PHOTOS';
    end if;

    select intro_text into v_intro_text from public.ga_branch where id = v_reg.branch_id;
    if v_intro_text is null or length(trim(v_intro_text)) < 50 then
      raise exception 'INTRO_TEXT_TOO_SHORT';
    end if;

    select * into v_company from public.ga_company where id = v_reg.ga_company_id;
    update public.ga_branch
    set registration_status = 'approved',
        status = case when v_company.approval_status = 'approved' then 'visible' else 'hidden' end,
        status_reason = null
    where id = v_reg.branch_id;

  elsif p_decision = 'rejected' and v_reg.request_type = 'create' then
    update public.ga_branch
    set registration_status = 'rejected'
    where id = v_reg.branch_id;

  elsif p_decision = 'approved' and v_reg.request_type = 'update' then
    v_payload := v_reg.payload;
    update public.ga_branch set
      name = coalesce(v_payload->>'name', name),
      region_id = case when v_payload ? 'regionId' then (v_payload->>'regionId')::uuid else region_id end,
      address = coalesce(v_payload->>'address', address),
      address_detail = coalesce(v_payload->>'addressDetail', address_detail),
      intro_text = coalesce(v_payload->>'introText', intro_text),
      education_info = coalesce(v_payload->>'educationInfo', education_info),
      welfare_info = coalesce(v_payload->>'welfareInfo', welfare_info),
      db_support_info = coalesce(v_payload->>'dbSupportInfo', db_support_info),
      settlement_support_info = coalesce(v_payload->>'settlementSupportInfo', settlement_support_info),
      planner_count = case when v_payload ? 'plannerCount' then (v_payload->>'plannerCount')::int else planner_count end,
      parking_available = case when v_payload ? 'parkingAvailable' then (v_payload->>'parkingAvailable')::boolean else parking_available end,
      visit_consult_available = case when v_payload ? 'visitConsultAvailable' then (v_payload->>'visitConsultAvailable')::boolean else visit_consult_available end,
      business_hours = coalesce(v_payload->>'businessHours', business_hours),
      tagline = coalesce(v_payload->>'tagline', tagline),
      short_tagline = case
        when v_payload ? 'shortTagline'
          then nullif(btrim(coalesce(v_payload->>'shortTagline', '')), '')
        else short_tagline
      end,
      new_recruit_training = case when v_payload ? 'newRecruitTraining' then (v_payload->>'newRecruitTraining')::boolean else new_recruit_training end,
      experienced_hire = case when v_payload ? 'experiencedHire' then (v_payload->>'experiencedHire')::boolean else experienced_hire end,
      db_support = case when v_payload ? 'dbSupport' then (v_payload->>'dbSupport')::boolean else db_support end,
      settlement_support = case when v_payload ? 'settlementSupport' then (v_payload->>'settlementSupport')::boolean else settlement_support end
    where id = v_reg.branch_id;

    update public.branch_media set pending_registration_id = null
    where pending_registration_id = p_registration_id;
  end if;

  update public.branch_registrations
  set status = p_decision, reviewed_by_admin_id = public.current_admin_id(), reviewed_at = now(),
      review_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  where id = p_registration_id;
end;
$$;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname='set_branch_short_tagline';        -- 1이어야 한다
-- select pg_get_functiondef(p.oid) ilike '%short_tagline%' from pg_proc p
--   join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname='review_branch_registration';      -- true여야 한다
-- select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname='review_branch_registration';      -- 여전히 1이어야 한다
