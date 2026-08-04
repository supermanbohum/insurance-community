-- =========================================================
-- 0050_remove_credits_1_tier.sql
-- 운영 정책 변경: 설계사 마켓 열람권 최소 구매 수량을 10건으로 상향한다
-- (기존엔 1건 단위 구매도 가능했음). 신규 구매만 막고, 과거에 이미 'credits_1'로
-- 구매한 이력(planner_market_credit_purchases)은 그대로 보존한다 - 그래서
-- 0036의 tier_code CHECK 제약(credits_1 포함)은 건드리지 않는다. 실제 구매를
-- 막는 지점은 오직 purchase_planner_market_credits RPC의 case 분기뿐이다
-- (이 테이블은 이 RPC를 통해서만 쓸 수 있어 - RPC only 원칙 - 여기서 막으면
-- 다른 어떤 경로로도 새 credits_1 구매가 생길 수 없다).
--
-- 0036 적용 후 실행.
-- =========================================================

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

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select public.purchase_planner_market_credits('credits_1', 'card', 'test'); -- INVALID_TIER 예외 발생해야 정상
