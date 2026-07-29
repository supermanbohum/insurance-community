-- =========================================================
-- 0025_subscriptions.sql
-- 결제/구독 상태 모델 - 지점 등록비(월4,900원, 선착순 100개 월1,900원)와
-- 고소득 설계사 인당 부가비(월1,900원).
--
-- 이번 범위에는 실제 PG(결제대행사) 계약이 없어(사용자 확인 완료) 항상 성공
-- 처리하는 스텁 프로바이더(src/lib/payments/)로만 동작한다. 그래서 이 마이그레이션은
-- 상태머신/유예기간/자동복구를 전부 완성하되, subscriptions.status는 아직 어떤
-- 공개 조회 RLS에도 연결하지 않는다(= "관측만 하고 강제하지 않는" 안전한 상태).
-- 실제 PG 연동 후 필요하면 ga_branch.status_reason='payment_suspended' 흐름을
-- 그대로 켜기만 하면 된다(로직은 이미 완성됨).
--
-- 0024 적용 후 실행.
-- =========================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('branch_listing', 'planner_addon')),
  subject_id uuid not null,  -- ga_branch.id 또는 planner_certifications.id (app 레벨 무결성)
  ga_company_id uuid not null references public.ga_company(id),

  plan_code text not null check (plan_code in ('branch_standard', 'branch_early_bird', 'planner_addon')),
  monthly_amount_krw int not null,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'grace_period', 'suspended', 'canceled')),

  current_period_end timestamptz not null default (now() + interval '1 month'),
  grace_period_ends_at timestamptz,
  last_payment_failure_at timestamptz,
  auto_unpublished_at timestamptz,
  manually_restored_by_admin_id uuid references public.admin_users(id),
  manually_restored_at timestamptz,

  payment_provider text not null default 'stub',
  provider_subscription_ref text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_subject on public.subscriptions(subject_type, subject_id);
create index if not exists idx_subscriptions_ga_company on public.subscriptions(ga_company_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

do $$
begin
  drop trigger if exists trg_set_updated_at on public.subscriptions;
  create trigger trg_set_updated_at before update on public.subscriptions
    for each row execute function public.set_updated_at();
end $$;

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount_krw int not null,
  status text not null check (status in ('succeeded', 'failed', 'refunded')),
  provider_transaction_ref text,
  failure_reason text,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_payment_tx_subscription on public.payment_transactions(subscription_id);

-- ---------------------------------------------------------
-- RLS - 결제 정보는 GA 관리자 본인 것만, 관리자는 서비스롤.
-- ---------------------------------------------------------
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;

create policy "ga admin read own subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true and ga.ga_company_id = subscriptions.ga_company_id
    )
  );

create policy "ga admin read own payment transactions"
  on public.payment_transactions for select
  using (
    exists (
      select 1 from public.subscriptions s
      join public.ga_admin_users ga on ga.ga_company_id = s.ga_company_id
      where s.id = payment_transactions.subscription_id and ga.auth_user_id = auth.uid() and ga.is_active = true
    )
  );

-- ---------------------------------------------------------
-- 지점 등록비 구독 생성 - 선착순 100개는 얼리버드 요금. 동시 가입 경합은
-- advisory lock으로 직렬화한다(카운트 자체에는 유일성 제약을 걸 수 없으므로).
-- ---------------------------------------------------------
create or replace function public.create_branch_subscription(p_branch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch public.ga_branch;
  v_early_bird_count int;
  v_plan text;
  v_amount int;
  v_subscription_id uuid;
begin
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;
  select * into v_branch from public.ga_branch where id = p_branch_id;

  if exists (select 1 from public.subscriptions where subject_type = 'branch_listing' and subject_id = p_branch_id and status <> 'canceled') then
    raise exception 'SUBSCRIPTION_ALREADY_EXISTS';
  end if;

  perform pg_advisory_xact_lock(hashtext('early_bird_slot'));
  select count(*) into v_early_bird_count from public.subscriptions where plan_code = 'branch_early_bird';

  if v_early_bird_count < 100 then
    v_plan := 'branch_early_bird';
    v_amount := 1900;
  else
    v_plan := 'branch_standard';
    v_amount := 4900;
  end if;

  insert into public.subscriptions (subject_type, subject_id, ga_company_id, plan_code, monthly_amount_krw)
  values ('branch_listing', p_branch_id, v_branch.ga_company_id, v_plan, v_amount)
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

grant execute on function public.create_branch_subscription(uuid) to authenticated;

-- ---------------------------------------------------------
-- 고소득 설계사 부가비 구독 생성 (인당 월1,900원, 인증 승인 후 가입)
-- ---------------------------------------------------------
create or replace function public.create_planner_addon_subscription(p_certification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.planner_certifications;
  v_subscription_id uuid;
begin
  select * into v_cert from public.planner_certifications where id = p_certification_id;
  if v_cert.id is null then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;
  if not public.is_ga_admin_for_branch(v_cert.branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;
  if exists (select 1 from public.subscriptions where subject_type = 'planner_addon' and subject_id = p_certification_id and status <> 'canceled') then
    raise exception 'SUBSCRIPTION_ALREADY_EXISTS';
  end if;

  insert into public.subscriptions (subject_type, subject_id, ga_company_id, plan_code, monthly_amount_krw)
  select 'planner_addon', p_certification_id, b.ga_company_id, 'planner_addon', 1900
  from public.ga_branch b where b.id = v_cert.branch_id
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

grant execute on function public.create_planner_addon_subscription(uuid) to authenticated;

-- ---------------------------------------------------------
-- 결제 결과 기록 - 웹훅/스텁 프로바이더가 서비스롤로 호출(실사용자 세션 아님이라
-- current_admin_id()/is_ga_admin_for_branch를 쓸 수 없음 - authenticated에는
-- 부여하지 않고 서비스롤 전용으로만 둔다).
-- ---------------------------------------------------------
create or replace function public.record_payment_result(
  p_subscription_id uuid,
  p_succeeded boolean,
  p_amount_krw int,
  p_provider_transaction_ref text default null,
  p_failure_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.payment_transactions (subscription_id, amount_krw, status, provider_transaction_ref, failure_reason)
  values (p_subscription_id, p_amount_krw, case when p_succeeded then 'succeeded' else 'failed' end, p_provider_transaction_ref, p_failure_reason);

  if p_succeeded then
    update public.subscriptions
    set status = 'active',
        current_period_end = now() + interval '1 month',
        grace_period_ends_at = null,
        last_payment_failure_at = null,
        updated_at = now()
    where id = p_subscription_id;
  else
    update public.subscriptions
    set status = 'past_due',
        last_payment_failure_at = now(),
        grace_period_ends_at = coalesce(grace_period_ends_at, now() + interval '7 days'),
        updated_at = now()
    where id = p_subscription_id;
  end if;
end;
$$;
-- authenticated에 grant하지 않는다 - 서비스롤(createAdminClient)에서만 호출.

-- ---------------------------------------------------------
-- 유예기간 만료 처리 - 매일 배치(Vercel Cron)가 서비스롤로 호출.
-- 7일 유예가 지난 구독을 suspended로 바꾸고 대상 지점을 자동 비공개한다.
-- ---------------------------------------------------------
create or replace function public.advance_grace_period_expirations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_sub record;
begin
  for v_sub in
    select * from public.subscriptions
    where status = 'past_due' and grace_period_ends_at is not null and grace_period_ends_at < now()
  loop
    update public.subscriptions
    set status = 'suspended', auto_unpublished_at = now(), updated_at = now()
    where id = v_sub.id;

    if v_sub.subject_type = 'branch_listing' then
      update public.ga_branch
      set status = 'hidden', status_reason = 'payment_suspended'
      where id = v_sub.subject_id and status_reason is distinct from 'manual';
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
-- authenticated에 grant하지 않는다 - Vercel Cron 라우트가 서비스롤로 호출.

-- ---------------------------------------------------------
-- 관리자 수동 복구 - 언제든 결제 유예/정지 상태를 되돌릴 수 있다.
-- ---------------------------------------------------------
create or replace function public.admin_restore_subscription(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions;
  v_admin_id uuid;
begin
  v_admin_id := public.current_admin_id();
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if v_sub.id is null then
    raise exception 'SUBSCRIPTION_NOT_FOUND';
  end if;

  update public.subscriptions
  set status = 'active', grace_period_ends_at = null, auto_unpublished_at = null,
      manually_restored_by_admin_id = v_admin_id, manually_restored_at = now(), updated_at = now()
  where id = p_subscription_id;

  if v_sub.subject_type = 'branch_listing' then
    update public.ga_branch
    set status = 'visible', status_reason = null
    where id = v_sub.subject_id and status_reason = 'payment_suspended';
  end if;
end;
$$;

grant execute on function public.admin_restore_subscription(uuid) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select plan_code, count(*) from public.subscriptions group by plan_code;
-- select proname from pg_proc where proname in ('create_branch_subscription','create_planner_addon_subscription','record_payment_result','advance_grace_period_expirations','admin_restore_subscription');
