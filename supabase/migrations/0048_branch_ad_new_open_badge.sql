-- =========================================================
-- 0048_branch_ad_new_open_badge.sql
-- 지점 광고상품 7종 중 "신규오픈배지"(new_open_badge)의 실제 노출 로직을 연결한다.
-- 0037은 이 상품의 결제/승인 인프라만 만들고 노출("추천 지점"만 연결)은 후속작업으로
-- 남겨뒀다 - 이번에 그 후속작업 중 가장 단순한 한 종류를 처리한다(순위 계산이
-- 필요없는 단순 on/off 플래그라 featured_branch보다 훨씬 간단하다).
--
-- 나머지 5종(main_banner/region_top_pin/search_top/top_exposure/event_banner)은
-- 아직 손대지 않는다 - main_banner/event_banner는 커스텀 크리에이티브가 필요해
-- 방금 만든 배너 시스템(0040/0001)과 역할이 겹치는 제품 결정이 먼저 필요하고,
-- region_top_pin/search_top/top_exposure는 검색/지역/지도 각각의 정렬 로직을
-- 건드려야 해서 별도 작업으로 분리한다.
--
-- 0037 적용 후 실행.
-- =========================================================

alter table public.ga_branch add column if not exists has_new_open_badge boolean not null default false;

create or replace function public.sync_branch_ad_exposure()
returns void
language plpgsql
as $$
begin
  update public.branch_ad_products
    set status = 'expired'
    where product_type in ('featured_branch', 'new_open_badge') and status = 'approved' and end_at < now();

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

  -- 신규오픈배지 - 순위 없는 단순 on/off. 활성 승인건이 없어지면 끄고, 있으면 켠다.
  update public.ga_branch b
    set has_new_open_badge = false
    where b.has_new_open_badge = true
      and not exists (
        select 1 from public.branch_ad_products p
        join public.ad_payments pay on pay.id = p.payment_id
        where p.branch_id = b.id and p.product_type = 'new_open_badge'
          and p.status = 'approved' and pay.status = 'paid'
          and now() between p.start_at and p.end_at
      );

  update public.ga_branch b
    set has_new_open_badge = true
    where b.has_new_open_badge = false
      and exists (
        select 1 from public.branch_ad_products p
        join public.ad_payments pay on pay.id = p.payment_id
        where p.branch_id = b.id and p.product_type = 'new_open_badge'
          and p.status = 'approved' and pay.status = 'paid'
          and now() between p.start_at and p.end_at
      );
end;
$$;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select has_new_open_badge, count(*) from public.ga_branch group by 1;
-- select public.sync_branch_ad_exposure(); -- 수동 실행해 반영 확인 가능
