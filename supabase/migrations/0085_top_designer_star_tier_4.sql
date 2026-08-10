-- ---------------------------------------------------------
-- TOP 설계사 등급 5단계 → 4단계 (10억 등급 제거, 오너 지시 2026-08-10 대규모 개편 ②)
--
-- star_5(⭐⭐⭐⭐⭐ 10억)를 제거하고 1억/2억/3억/5억 4단계만 남긴다. 적용 시점
-- 기준 star_tier='star_5'인 행이 0건인 것을 확인했다(현재 승인된 TOP 설계사가
-- 아직 없다) - 기존 데이터를 건드릴 필요 없이 제약만 좁히면 된다.
-- ---------------------------------------------------------

alter table public.top_designer_certifications
  drop constraint top_designer_certifications_star_tier_check;

alter table public.top_designer_certifications
  add constraint top_designer_certifications_star_tier_check
  check (star_tier in ('star_1', 'star_2', 'star_3', 'star_4'));

-- admin_review_top_designer_certification의 유효값 검사도 동일하게 좁힌다 -
-- 0082 원본 그대로 재현하고 유효값 목록(star_5 제거) 한 줄만 바꿨다.
create or replace function public.admin_review_top_designer_certification(p_certification_id uuid, p_decision text, p_star_tier text default null, p_confirmed_income_krw bigint default null, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.current_admin_id();
begin
  if v_admin_id is null then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;
  if p_decision not in ('approved', 'on_hold', 'rejected', 'pending_review') then
    raise exception 'INVALID_DECISION';
  end if;
  if not exists (select 1 from public.top_designer_certifications where id = p_certification_id) then
    raise exception 'CERTIFICATION_NOT_FOUND';
  end if;

  if p_decision = 'approved' then
    if p_star_tier not in ('star_1', 'star_2', 'star_3', 'star_4') then
      raise exception 'INVALID_STAR_TIER';
    end if;
    if p_confirmed_income_krw is null or p_confirmed_income_krw <= 0 then
      raise exception 'INVALID_CONFIRMED_INCOME';
    end if;
    update public.top_designer_certifications set
      status = 'approved',
      star_tier = p_star_tier,
      confirmed_annual_income_krw = p_confirmed_income_krw,
      review_reason = null,
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      income_doc_storage_path = null,
      business_card_path = null,
      updated_at = now()
    where id = p_certification_id;
  elsif p_decision in ('on_hold', 'rejected') then
    if length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'REASON_REQUIRED';
    end if;
    update public.top_designer_certifications set
      status = p_decision,
      review_reason = trim(p_reason),
      reviewed_by_admin_id = v_admin_id,
      reviewed_at = now(),
      income_doc_storage_path = case when p_decision = 'rejected' then null else income_doc_storage_path end,
      business_card_path = case when p_decision = 'rejected' then null else business_card_path end,
      updated_at = now()
    where id = p_certification_id;
  else
    update public.top_designer_certifications set
      status = 'pending_review',
      review_reason = null,
      reviewed_by_admin_id = null,
      reviewed_at = null,
      updated_at = now()
    where id = p_certification_id;
  end if;
end;
$$;

grant execute on function public.admin_review_top_designer_certification(uuid, text, text, bigint, text) to authenticated;
