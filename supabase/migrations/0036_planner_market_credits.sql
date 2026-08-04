-- =========================================================
-- 0036_planner_market_credits.sql
-- 설계사 마켓 - GA가 구매하는 "열람권"(설계사 연락처 조회 크레딧). 결제는 이번
-- 단계에서 스텁(항상 성공)이고, 실제 PG 연동은 이후 별도 작업이다(src/lib/payments).
--
-- 핵심은 get_planner_contact()의 동시성 안전성이다 - 같은 GA가 같은 설계사를
-- 두 탭에서 동시에 "연락처 보기"를 눌러도 정확히 1건만 차감되어야 한다. advisory
-- lock 대신 planner_market_credit_unlocks의 unique(ga_company_id, planner_profile_id)
-- 제약 + insert ... on conflict do nothing를 쓰고, 언락 insert와 잔액 차감을 같은
-- 함수(=같은 트랜잭션) 안에서 처리해 차감 실패 시 언락 insert도 함께 롤백되게 한다.
--
-- 크레딧은 GA 지점이 아니라 GA 본사(ga_company_id) 단위로 스코프한다 - 여러
-- 지점을 관리하는 GA 관리자가 열람권을 공유해서 쓸 수 있어야 하기 때문이다.
--
-- 0035 적용 후 실행.
-- =========================================================

create table if not exists public.planner_market_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  ga_company_id uuid not null references public.ga_company(id),
  purchased_by_ga_admin_id uuid not null references public.ga_admin_users(id),
  tier_code text not null check (tier_code in ('credits_1', 'credits_10', 'credits_30', 'credits_50', 'credits_100')),
  credit_count int not null check (credit_count > 0),
  unit_price_krw int not null,
  amount_krw int not null,
  status text not null default 'paid' check (status in ('paid', 'refunded', 'failed')),
  payment_method text,
  provider_transaction_ref text,
  refunded_by_admin_id uuid references public.admin_users(id),
  refunded_at timestamptz,
  refund_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pm_credit_purchases_company on public.planner_market_credit_purchases(ga_company_id);

create table if not exists public.planner_market_credit_balances (
  ga_company_id uuid primary key references public.ga_company(id),
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- 언락 = "이 GA사가 이 설계사의 연락처를 열람한 적 있다"의 유일한 판정 기준.
-- unique 제약이 동시요청 이중과금을 막는 실제 안전장치다.
create table if not exists public.planner_market_credit_unlocks (
  id uuid primary key default gen_random_uuid(),
  ga_company_id uuid not null references public.ga_company(id),
  planner_profile_id uuid not null references public.planner_profiles(id) on delete cascade,
  unlocked_by_ga_admin_id uuid not null references public.ga_admin_users(id),
  created_at timestamptz not null default now(),
  unique (ga_company_id, planner_profile_id)
);

create index if not exists idx_pm_credit_unlocks_company on public.planner_market_credit_unlocks(ga_company_id);

-- 관리자 수동 지급/차감 감사로그 - 잔액을 직접 고치지 않고 항상 이 로그를 남긴 뒤
-- 그 delta만큼 balance를 갱신한다(admin_restore_subscription의 감사기록 관례와 동일).
create table if not exists public.planner_market_credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  ga_company_id uuid not null references public.ga_company(id),
  delta int not null check (delta <> 0),
  reason text not null,
  adjusted_by_admin_id uuid not null references public.admin_users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- RLS - 4개 테이블 모두 "본인 회사 것만 읽기"만 허용, 쓰기 정책 없음(RPC 전용).
-- ---------------------------------------------------------
alter table public.planner_market_credit_purchases enable row level security;
alter table public.planner_market_credit_balances enable row level security;
alter table public.planner_market_credit_unlocks enable row level security;
alter table public.planner_market_credit_adjustments enable row level security;

create policy "ga admin reads own company credit purchases"
  on public.planner_market_credit_purchases for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true
        and ga.ga_company_id = planner_market_credit_purchases.ga_company_id
    )
  );

create policy "ga admin reads own company credit balance"
  on public.planner_market_credit_balances for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true
        and ga.ga_company_id = planner_market_credit_balances.ga_company_id
    )
  );

create policy "ga admin reads own company credit unlocks"
  on public.planner_market_credit_unlocks for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true
        and ga.ga_company_id = planner_market_credit_unlocks.ga_company_id
    )
  );

create policy "ga admin reads own company credit adjustments"
  on public.planner_market_credit_adjustments for select
  using (
    exists (
      select 1 from public.ga_admin_users ga
      where ga.auth_user_id = auth.uid() and ga.is_active = true
        and ga.ga_company_id = planner_market_credit_adjustments.ga_company_id
    )
  );

-- ---------------------------------------------------------
-- 구매 - 가격은 서버에서 계산한다(클라이언트가 보낸 금액을 신뢰하지 않음).
-- 최종 확정 가격: 1건=33,000 / 10건=330,000 / 30건=990,000 / 50건=1,650,000 / 100건=3,000,000(10%할인).
-- ---------------------------------------------------------
create or replace function public.purchase_planner_market_credits(
  p_tier_code text,
  p_payment_method text,
  p_provider_transaction_ref text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_credit_count int;
  v_unit_price int;
  v_amount int;
  v_purchase_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;

  case p_tier_code
    when 'credits_1' then v_credit_count := 1; v_unit_price := 33000; v_amount := 33000;
    when 'credits_10' then v_credit_count := 10; v_unit_price := 33000; v_amount := 330000;
    when 'credits_30' then v_credit_count := 30; v_unit_price := 33000; v_amount := 990000;
    when 'credits_50' then v_credit_count := 50; v_unit_price := 33000; v_amount := 1650000;
    when 'credits_100' then v_credit_count := 100; v_unit_price := 30000; v_amount := 3000000;
    else raise exception 'INVALID_TIER';
  end case;

  insert into public.planner_market_credit_purchases (
    ga_company_id, purchased_by_ga_admin_id, tier_code, credit_count, unit_price_krw, amount_krw,
    status, payment_method, provider_transaction_ref
  ) values (
    v_admin.ga_company_id, v_admin.id, p_tier_code, v_credit_count, v_unit_price, v_amount,
    'paid', p_payment_method, p_provider_transaction_ref
  ) returning id into v_purchase_id;

  insert into public.planner_market_credit_balances (ga_company_id, balance, updated_at)
  values (v_admin.ga_company_id, v_credit_count, now())
  on conflict (ga_company_id) do update
    set balance = public.planner_market_credit_balances.balance + excluded.balance, updated_at = now();

  return v_purchase_id;
end;
$$;

grant execute on function public.purchase_planner_market_credits(text, text, text) to authenticated;

-- ---------------------------------------------------------
-- 연락처 언락 - 핵심 원자적 로직. 이미 언락된 적 있으면(동시요청 포함) 과금 없이
-- 바로 반환하고, 처음 언락하는 트랜잭션만 잔액을 차감한다. 잔액 부족 시 예외로
-- 롤백되어 언락 insert 자체가 없었던 것처럼 되돌아간다.
-- ---------------------------------------------------------
create or replace function public.get_planner_contact(p_planner_profile_id uuid)
returns table (name text, phone text, email text, kakao_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_profile public.planner_profiles;
  v_unlock_id uuid;
  v_updated int;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;

  select * into v_profile from public.planner_profiles where id = p_planner_profile_id;
  if v_profile.id is null or v_profile.status <> 'approved' or v_profile.withdrawn_at is not null then
    raise exception 'PROFILE_NOT_AVAILABLE';
  end if;
  if v_profile.contact_sharing_revoked_at is not null then
    raise exception 'CONTACT_SHARING_REVOKED';
  end if;

  select id into v_unlock_id from public.planner_market_credit_unlocks
    where ga_company_id = v_admin.ga_company_id and planner_profile_id = p_planner_profile_id;

  if v_unlock_id is null then
    insert into public.planner_market_credit_unlocks (ga_company_id, planner_profile_id, unlocked_by_ga_admin_id)
    values (v_admin.ga_company_id, p_planner_profile_id, v_admin.id)
    on conflict (ga_company_id, planner_profile_id) do nothing
    returning id into v_unlock_id;

    if v_unlock_id is not null then
      -- 이 트랜잭션이 언락을 선점했을 때만 차감한다.
      update public.planner_market_credit_balances
        set balance = balance - 1, updated_at = now()
        where ga_company_id = v_admin.ga_company_id and balance >= 1;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'INSUFFICIENT_CREDITS'; -- 방금 만든 unlock insert까지 함께 롤백된다.
      end if;
    else
      -- 동시 요청 중 다른 트랜잭션이 먼저 언락을 완료함 - 과금 없이 통과.
      select id into v_unlock_id from public.planner_market_credit_unlocks
        where ga_company_id = v_admin.ga_company_id and planner_profile_id = p_planner_profile_id;
    end if;
  end if;

  return query select v_profile.name, v_profile.phone, v_profile.email, v_profile.kakao_id;
end;
$$;

grant execute on function public.get_planner_contact(uuid) to authenticated;

create or replace function public.get_my_planner_market_credit_balance()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(b.balance, 0)
  from public.ga_admin_users ga
  left join public.planner_market_credit_balances b on b.ga_company_id = ga.ga_company_id
  where ga.auth_user_id = auth.uid() and ga.is_active = true
  limit 1;
$$;

grant execute on function public.get_my_planner_market_credit_balance() to authenticated;

create or replace function public.list_my_planner_market_credit_purchases()
returns setof public.planner_market_credit_purchases
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.planner_market_credit_purchases p
  join public.ga_admin_users ga on ga.ga_company_id = p.ga_company_id
  where ga.auth_user_id = auth.uid() and ga.is_active = true
  order by p.created_at desc;
$$;

grant execute on function public.list_my_planner_market_credit_purchases() to authenticated;

-- ---------------------------------------------------------
-- 관리자 수동 지급/차감 - delta는 양(지급)/음(차감) 모두 가능. 잔액이 음수가 되는
-- 차감은 막고, 항상 감사로그를 남긴다.
-- ---------------------------------------------------------
create or replace function public.admin_adjust_planner_market_credits(
  p_ga_company_id uuid,
  p_delta int,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_current_balance int;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_delta = 0 then
    raise exception 'INVALID_DELTA';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'REASON_REQUIRED';
  end if;

  select coalesce(balance, 0) into v_current_balance
  from public.planner_market_credit_balances where ga_company_id = p_ga_company_id;

  if coalesce(v_current_balance, 0) + p_delta < 0 then
    raise exception 'BALANCE_WOULD_GO_NEGATIVE';
  end if;

  insert into public.planner_market_credit_balances (ga_company_id, balance, updated_at)
  values (p_ga_company_id, greatest(p_delta, 0), now())
  on conflict (ga_company_id) do update
    set balance = public.planner_market_credit_balances.balance + p_delta, updated_at = now();

  insert into public.planner_market_credit_adjustments (ga_company_id, delta, reason, adjusted_by_admin_id)
  values (p_ga_company_id, p_delta, trim(p_reason), v_admin_id);
end;
$$;

grant execute on function public.admin_adjust_planner_market_credits(uuid, int, text) to authenticated;

-- ---------------------------------------------------------
-- 관리자 환불 - 이미 구매분을 넘어서 소진된 상태라면(잔액이 환불량보다 적으면)
-- 자동으로 마이너스로 만들지 않고 막는다 - 그런 경우는 admin_adjust로 수동 처리.
-- ---------------------------------------------------------
create or replace function public.admin_refund_planner_market_credit_purchase(
  p_purchase_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_purchase public.planner_market_credit_purchases;
  v_current_balance int;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  select * into v_purchase from public.planner_market_credit_purchases where id = p_purchase_id;
  if v_purchase.id is null then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;
  if v_purchase.status <> 'paid' then
    raise exception 'ALREADY_REFUNDED_OR_FAILED';
  end if;

  select coalesce(balance, 0) into v_current_balance
  from public.planner_market_credit_balances where ga_company_id = v_purchase.ga_company_id;

  if coalesce(v_current_balance, 0) < v_purchase.credit_count then
    raise exception 'INSUFFICIENT_BALANCE_FOR_REFUND';
  end if;

  update public.planner_market_credit_purchases
  set status = 'refunded', refunded_by_admin_id = v_admin_id, refunded_at = now(),
      refund_reason = trim(p_reason)
  where id = p_purchase_id;

  update public.planner_market_credit_balances
  set balance = balance - v_purchase.credit_count, updated_at = now()
  where ga_company_id = v_purchase.ga_company_id;
end;
$$;

grant execute on function public.admin_refund_planner_market_credit_purchase(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select proname from pg_proc where proname like '%planner_market_credit%' or proname = 'get_planner_contact';
