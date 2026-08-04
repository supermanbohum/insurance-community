-- =========================================================
-- 0037_branch_ad_products.sql
-- 지점(광고) 상품 - 설계사 마켓(0034~0036)과 완전히 독립된 두 번째 수익 스트림.
-- GA가 지점 노출을 위한 광고 상품을 구매하면 관리자 승인을 거쳐 지점 노출에
-- 반영된다. 흐름: 광고(branch_ad_products) -> 결제(ad_payments) -> 관리자 승인
-- -> ga_branch 표시. 세 단계를 절대 하나로 합치지 않는다.
--
-- 기존 ga_branch.is_recommended/recommended_rank(0006)는 그대로 두되, 이번
-- 광고 시스템은 그 컬럼을 절대 직접 쓰지 않는다 - 오직 sync_branch_ad_exposure()가
-- "승인+결제완료+기간내" 조건으로 계산한 결과만 반영한다. 기존 set_branch_recommended()
-- (0008, 플랫폼 관리자의 수동 오버라이드 + 감사로그)는 이 마이그레이션에서 손대지
-- 않고 그대로 남겨두며, sync_branch_ad_exposure()는 그 함수를 거치지 않고 직접
-- 갱신한다(15분마다 자동 실행되는 계산 결과에 매번 감사로그를 남기는 건 의미가
-- 없고, 수동 오버라이드 이력과 자동 계산 이력을 섞으면 오히려 추적이 어려워지므로
-- 의도적으로 분리한다).
--
-- product_type은 향후 상품 추가를 고려해 7종으로 미리 열어두되, 이번 단계에서
-- 실제 노출(ga_branch 반영)은 "추천 지점"만 연결한다. 나머지 6종은 결제/승인
-- 인프라만 갖추고 실제 노출 로직은 후속 작업이다.
--
-- 0036 적용 후 실행.
-- =========================================================

create table if not exists public.ad_payments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.ga_admin_users(id),
  product_type text not null check (product_type in (
    'featured_branch', 'main_banner', 'region_top_pin', 'search_top',
    'new_open_badge', 'top_exposure', 'event_banner'
  )),
  amount int not null,
  vat int not null,
  total_amount int not null,
  payment_method text,
  pg_tid text,
  status text not null default 'paid' check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_payments_buyer on public.ad_payments(buyer_id);

create table if not exists public.branch_ad_products (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.ga_branch(id) on delete cascade,
  product_type text not null check (product_type in (
    'featured_branch', 'main_banner', 'region_top_pin', 'search_top',
    'new_open_badge', 'top_exposure', 'event_banner'
  )),
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'expired', 'canceled')),
  payment_id uuid references public.ad_payments(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_branch_ad_products_branch on public.branch_ad_products(branch_id);
create index if not exists idx_branch_ad_products_status on public.branch_ad_products(status);
create index if not exists idx_branch_ad_products_active on public.branch_ad_products(product_type, status, start_at, end_at);

-- ---------------------------------------------------------
-- RLS - GA 관리자는 본인 지점 광고/결제만 읽는다. 쓰기 정책 없음(RPC 전용).
-- ---------------------------------------------------------
alter table public.ad_payments enable row level security;
alter table public.branch_ad_products enable row level security;

create policy "ga admin read own branch ad products"
  on public.branch_ad_products for select
  using (public.is_ga_admin_for_branch(branch_id));

create policy "ga admin read own company ad payments"
  on public.ad_payments for select
  using (
    exists (
      select 1 from public.ga_admin_users buyer
      join public.ga_admin_users me on me.auth_user_id = auth.uid() and me.is_active = true
      where buyer.id = ad_payments.buyer_id and buyer.ga_company_id = me.ga_company_id
    )
  );

-- ---------------------------------------------------------
-- 구매 - 가격은 서버에서 계산한다. 상품별 기본가는 잠정치이며, 실제 PG 연동 전
-- 관리자가 조정할 수 있도록 후속 작업에서 상품 마스터 테이블로 분리할 수 있다.
-- ---------------------------------------------------------
create or replace function public.purchase_branch_ad_product(
  p_branch_id uuid,
  p_product_type text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_payment_method text default null,
  p_pg_tid text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.ga_admin_users;
  v_amount int;
  v_vat int;
  v_total int;
  v_payment_id uuid;
  v_product_id uuid;
begin
  select * into v_admin from public.ga_admin_users where auth_user_id = auth.uid() and is_active = true;
  if v_admin.id is null then
    raise exception 'NOT_GA_ADMIN';
  end if;
  if not public.is_ga_admin_for_branch(p_branch_id) then
    raise exception 'NOT_AUTHORIZED_FOR_BRANCH';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'INVALID_DATE_RANGE';
  end if;

  case p_product_type
    when 'featured_branch' then v_amount := 100000;
    when 'main_banner' then v_amount := 300000;
    when 'region_top_pin' then v_amount := 150000;
    when 'search_top' then v_amount := 150000;
    when 'new_open_badge' then v_amount := 50000;
    when 'top_exposure' then v_amount := 200000;
    when 'event_banner' then v_amount := 100000;
    else raise exception 'INVALID_PRODUCT_TYPE';
  end case;
  v_vat := round(v_amount * 0.1);
  v_total := v_amount + v_vat;

  insert into public.ad_payments (buyer_id, product_type, amount, vat, total_amount, payment_method, pg_tid, status, paid_at)
  values (v_admin.id, p_product_type, v_amount, v_vat, v_total, p_payment_method, p_pg_tid, 'paid', now())
  returning id into v_payment_id;

  insert into public.branch_ad_products (branch_id, product_type, start_at, end_at, status, payment_id)
  values (p_branch_id, p_product_type, p_start_at, p_end_at, 'pending_review', v_payment_id)
  returning id into v_product_id;

  return v_product_id;
end;
$$;

grant execute on function public.purchase_branch_ad_product(uuid, text, timestamptz, timestamptz, text, text) to authenticated;

-- ---------------------------------------------------------
-- 계산 전담 함수 - authenticated에 grant하지 않는다(pg_cron 및 아래 두 관리자
-- RPC의 perform 호출에서만 실행). ga_branch를 직접 갱신하는 유일한 경로다.
-- ---------------------------------------------------------
create or replace function public.sync_branch_ad_exposure()
returns void
language plpgsql
as $$
begin
  update public.branch_ad_products
    set status = 'expired'
    where product_type = 'featured_branch' and status = 'approved' and end_at < now();

  update public.ga_branch b
    set is_recommended = false, recommended_rank = null
    where b.is_recommended = true
      and not exists (
        select 1 from public.branch_ad_products p
        join public.ad_payments pay on pay.id = p.payment_id
        where p.branch_id = b.id and p.product_type = 'featured_branch'
          and p.status = 'approved' and pay.status = 'paid'
          and now() between p.start_at and p.end_at
      );

  with active_featured as (
    select p.branch_id, row_number() over (order by pay.paid_at asc) as rn
    from public.branch_ad_products p
    join public.ad_payments pay on pay.id = p.payment_id
    where p.product_type = 'featured_branch' and p.status = 'approved' and pay.status = 'paid'
      and now() between p.start_at and p.end_at
  )
  update public.ga_branch b
    set is_recommended = true, recommended_rank = af.rn
    from active_featured af
    where af.branch_id = b.id
      and (b.is_recommended is distinct from true or b.recommended_rank is distinct from af.rn);
end;
$$;

-- ---------------------------------------------------------
-- 관리자 승인/반려 - 승인/반려 후 sync_branch_ad_exposure()를 호출해 ga_branch에
-- 반영한다(직접 update하지 않는다 - 계산 로직을 한 곳에 유지). 반려 시 결제도 환불 처리.
-- ---------------------------------------------------------
create or replace function public.admin_review_branch_ad_product(
  p_ad_product_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_product public.branch_ad_products;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_product from public.branch_ad_products where id = p_ad_product_id;
  if v_product.id is null then
    raise exception 'AD_PRODUCT_NOT_FOUND';
  end if;
  if v_product.status <> 'pending_review' then
    raise exception 'ALREADY_REVIEWED';
  end if;

  update public.branch_ad_products set status = p_decision where id = p_ad_product_id;

  if p_decision = 'rejected' then
    update public.ad_payments set status = 'refunded' where id = v_product.payment_id and status = 'paid';
  end if;

  perform public.sync_branch_ad_exposure();
end;
$$;

grant execute on function public.admin_review_branch_ad_product(uuid, text, text) to authenticated;

-- ---------------------------------------------------------
-- 기간 연장 - 승인됨(또는 방금 만료됨) 상태에서만 가능.
-- ---------------------------------------------------------
create or replace function public.admin_extend_branch_ad_product(
  p_ad_product_id uuid,
  p_new_end_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
  v_product public.branch_ad_products;
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  select * into v_product from public.branch_ad_products where id = p_ad_product_id;
  if v_product.id is null then
    raise exception 'AD_PRODUCT_NOT_FOUND';
  end if;
  if v_product.status not in ('approved', 'expired') then
    raise exception 'INVALID_STATE_FOR_EXTENSION';
  end if;
  if p_new_end_at <= v_product.start_at then
    raise exception 'INVALID_DATE_RANGE';
  end if;

  update public.branch_ad_products set end_at = p_new_end_at, status = 'approved' where id = p_ad_product_id;
  perform public.sync_branch_ad_exposure();
end;
$$;

grant execute on function public.admin_extend_branch_ad_product(uuid, timestamptz) to authenticated;

-- 15분마다 만료/노출을 재계산한다. 이미 같은 이름의 스케줄이 있으면 먼저 지우고
-- 재등록한다(마이그레이션을 다시 실행해도 중복 등록되지 않게, 0033과 동일 관례).
select cron.unschedule(jobid) from cron.job where jobname = 'sync-branch-ad-exposure';
select cron.schedule('sync-branch-ad-exposure', '*/15 * * * *', $$select public.sync_branch_ad_exposure();$$);

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from cron.job where jobname = 'sync-branch-ad-exposure';
-- select public.sync_branch_ad_exposure(); -- 수동으로 한 번 실행해 동작 확인 가능
-- select proname from pg_proc where proname like '%branch_ad_product%' or proname = 'sync_branch_ad_exposure';
