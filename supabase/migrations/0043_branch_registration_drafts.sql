-- =========================================================
-- 0043_branch_registration_drafts.sql
-- 지점 "신뢰도 항목 수정" 큐(branch_registrations)에 임시저장 + 대기중 수정 + 정확한
-- 변경이력(전/후 스냅샷)을 추가한다. 기존 즉시반영 항목(연락처/취급보험사/채용/SNS링크)
-- RPC는 전혀 건드리지 않는다 - 이번 마이그레이션은 오직 재승인 대상 큐(branch_registrations)만
-- 다룬다.
--
-- 해결하는 문제 3가지:
--   1) submit_branch_update가 매번 새 행을 insert만 해서, "승인대기 중에는 수정 불가"로
--      UI가 막아둘 수밖에 없었다(DB가 중복 대기행을 막지 못했으므로). 이제
--      request_type='update'이고 status가 draft/pending인 행은 지점당 최대 1개로
--      강제하고, submit_branch_update/save_branch_update_draft가 그 행을 upsert한다.
--   2) 임시저장 개념 자체가 없었다(작성중 상태 없이 제출만 가능). status에 'draft' 추가.
--   3) 승인 후 변경이력 diff가 "현재 ga_branch"를 다시 조회해서 계산돼, 승인된 순간부터
--      old==new가 되어버려 이력이 사라지는 버그가 있었다. before_snapshot 컬럼에 제출
--      시점의 실제 이전 값을 스냅샷으로 저장해 이후 언제 봐도 정확하게 만든다.
--
-- 0022 적용 후 실행.
-- =========================================================

do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.branch_registrations'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%pending%approved%rejected%';

  if v_conname is not null then
    execute format('alter table public.branch_registrations drop constraint %I', v_conname);
  end if;

  alter table public.branch_registrations add constraint branch_registrations_status_check
    check (status in ('draft', 'pending', 'approved', 'rejected'));
end $$;

alter table public.branch_registrations add column if not exists before_snapshot jsonb not null default '{}'::jsonb;

-- request_type='update' 요청은 지점당 열려있는(draft/pending) 행이 최대 1개여야 한다.
-- request_type='create'는 애초에 지점 하나당 생성 요청이 하나뿐이라 대상에서 제외한다.
create unique index if not exists idx_branch_registrations_one_open_update
  on public.branch_registrations (branch_id)
  where request_type = 'update' and status in ('draft', 'pending');

-- ---------------------------------------------------------
-- 신뢰도 항목의 "현재 값" 스냅샷 - submit_branch_update/save_branch_update_draft가
-- before_snapshot을 채울 때 공용으로 쓴다. review_branch_registration이 적용하는
-- 필드 목록과 정확히 일치해야 한다.
-- ---------------------------------------------------------
create or replace function public.branch_trust_snapshot(p_branch_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', b.name,
    'regionId', b.region_id,
    'address', b.address,
    'addressDetail', b.address_detail,
    'introText', b.intro_text,
    'educationInfo', b.education_info,
    'welfareInfo', b.welfare_info,
    'dbSupportInfo', b.db_support_info,
    'settlementSupportInfo', b.settlement_support_info,
    'plannerCount', b.planner_count,
    'parkingAvailable', b.parking_available,
    'visitConsultAvailable', b.visit_consult_available,
    'businessHours', b.business_hours,
    'tagline', b.tagline,
    'newRecruitTraining', b.new_recruit_training,
    'experiencedHire', b.experienced_hire,
    'dbSupport', b.db_support,
    'settlementSupport', b.settlement_support
  )
  from public.ga_branch b where b.id = p_branch_id;
$$;

-- ---------------------------------------------------------
-- 임시저장 - 작성중 내용을 draft 상태로 보관한다. 이미 대기중(pending) 행이 있으면
-- 그 행의 내용만 갱신하고 상태는 pending 그대로 둔다(임시저장이 이미 제출된 건을
-- 되돌리지 않는다). 필수값 검증은 하지 않는다 - 초안이라 비어있을 수 있다.
-- ---------------------------------------------------------
create or replace function public.save_branch_update_draft(
  p_branch_id uuid,
  p_registrant_name text default null,
  p_registrant_title text default null,
  p_registrant_phone text default null,
  p_registrant_company text default null,
  p_registrant_branch_label text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_existing public.branch_registrations;
  v_registration_id uuid;
begin
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
  end if;
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;

  select * into v_existing from public.branch_registrations
  where branch_id = p_branch_id and request_type = 'update' and status in ('draft', 'pending')
  limit 1;

  if v_existing.id is not null then
    update public.branch_registrations set
      registrant_name = coalesce(nullif(trim(coalesce(p_registrant_name, '')), ''), registrant_name),
      registrant_title = coalesce(nullif(trim(coalesce(p_registrant_title, '')), ''), registrant_title),
      registrant_phone = coalesce(nullif(trim(coalesce(p_registrant_phone, '')), ''), registrant_phone),
      registrant_company = coalesce(nullif(trim(coalesce(p_registrant_company, '')), ''), registrant_company),
      registrant_branch_label = coalesce(nullif(trim(coalesce(p_registrant_branch_label, '')), ''), registrant_branch_label),
      payload = p_payload,
      updated_at = now()
    where id = v_existing.id
    returning id into v_registration_id;
  else
    insert into public.branch_registrations (
      request_type, status, branch_id, ga_company_id, submitted_by_ga_admin_id,
      registrant_name, registrant_title, registrant_phone, registrant_company, registrant_branch_label,
      payload, before_snapshot
    ) values (
      'update', 'draft', p_branch_id, v_admin.ga_company_id, v_admin.id,
      coalesce(nullif(trim(coalesce(p_registrant_name, '')), ''), ''),
      coalesce(nullif(trim(coalesce(p_registrant_title, '')), ''), ''),
      coalesce(nullif(trim(coalesce(p_registrant_phone, '')), ''), ''),
      coalesce(nullif(trim(coalesce(p_registrant_company, '')), ''), ''),
      coalesce(nullif(trim(coalesce(p_registrant_branch_label, '')), ''), ''),
      p_payload, public.branch_trust_snapshot(p_branch_id)
    ) returning id into v_registration_id;
  end if;

  return v_registration_id;
end;
$$;

grant execute on function public.save_branch_update_draft(uuid, text, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- 제출 - draft가 있으면 pending으로 승격, pending이 있으면 그 자리에서 최신 내용으로
-- 갱신(관리자는 항상 최신 내용만 승인), 아무것도 없으면 새로 만든다. before_snapshot은
-- 제출 시점의 실제 라이브 값으로 항상 새로 찍어 정확한 전/후 이력을 남긴다.
-- ---------------------------------------------------------
create or replace function public.submit_branch_update(
  p_branch_id uuid,
  p_registrant_name text,
  p_registrant_title text,
  p_registrant_phone text,
  p_registrant_company text,
  p_registrant_branch_label text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_existing public.branch_registrations;
  v_registration_id uuid;
begin
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_GA_ADMIN_FOR_BRANCH';
  end if;
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;

  if length(trim(p_registrant_name)) = 0 or length(trim(p_registrant_title)) = 0
     or length(trim(p_registrant_phone)) = 0 or length(trim(p_registrant_company)) = 0
     or length(trim(p_registrant_branch_label)) = 0 then
    raise exception 'MISSING_REGISTRANT_INFO';
  end if;
  if p_payload is null or p_payload = '{}'::jsonb then
    raise exception 'EMPTY_PAYLOAD';
  end if;

  select * into v_existing from public.branch_registrations
  where branch_id = p_branch_id and request_type = 'update' and status in ('draft', 'pending')
  limit 1;

  if v_existing.id is not null then
    update public.branch_registrations set
      status = 'pending',
      registrant_name = trim(p_registrant_name),
      registrant_title = trim(p_registrant_title),
      registrant_phone = trim(p_registrant_phone),
      registrant_company = trim(p_registrant_company),
      registrant_branch_label = trim(p_registrant_branch_label),
      payload = p_payload,
      before_snapshot = public.branch_trust_snapshot(p_branch_id),
      updated_at = now()
    where id = v_existing.id
    returning id into v_registration_id;
  else
    insert into public.branch_registrations (
      request_type, status, branch_id, ga_company_id, submitted_by_ga_admin_id,
      registrant_name, registrant_title, registrant_phone, registrant_company, registrant_branch_label,
      payload, before_snapshot
    ) values (
      'update', 'pending', p_branch_id, v_admin.ga_company_id, v_admin.id,
      trim(p_registrant_name), trim(p_registrant_title), trim(p_registrant_phone), trim(p_registrant_company), trim(p_registrant_branch_label),
      p_payload, public.branch_trust_snapshot(p_branch_id)
    ) returning id into v_registration_id;
  end if;

  return v_registration_id;
end;
$$;

grant execute on function public.submit_branch_update(uuid, text, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- 특정 지점의 현재 열려있는(draft/pending) 수정 요청 조회 - 수정 폼이 페이지 로드 시
-- 이걸로 이전 작성 내용을 복원한다("브라우저를 닫아도 이어서 작성").
-- ---------------------------------------------------------
create or replace function public.get_open_branch_update(p_branch_id uuid)
returns setof public.branch_registrations
language sql
stable
security definer
set search_path = public
as $$
  select * from public.branch_registrations
  where branch_id = p_branch_id and request_type = 'update' and status in ('draft', 'pending')
  limit 1;
$$;

grant execute on function public.get_open_branch_update(uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select status, count(*) from public.branch_registrations group by 1;
-- select proname from pg_proc where proname in ('branch_trust_snapshot','save_branch_update_draft','submit_branch_update','get_open_branch_update');
