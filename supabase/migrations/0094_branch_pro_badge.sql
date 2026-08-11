-- =========================================================
-- 0094_branch_pro_badge.sql
-- ⑧ PRO 뱃지(오너 지시 "pro는 뱃지만 제작하고 일단 보류", 디자인 SPEC-035 v2).
-- 이번 범위는 "뱃지"뿐이다 - 지점 게시글·고급 편집·PRO 소개 페이지·혜택 나열은
-- 전부 보류라 만들지 않는다(CTO 확인). 결제도 없다(토스 심사 중) - 운영팀이 관리자
-- 화면에서 수동으로 부여한다.
--
-- 🔴 boolean(is_pro)이 아니라 만료 시각(pro_until)으로 둔 이유: 디자인 스펙이
-- "만료 시 조용히 제거 - 상실 연출 금지"를 요구한다. boolean이면 만료를 감지해
-- false로 뒤집는 배치/크론이 따로 필요하고, 그게 밀리는 순간 "만료됐는데 PRO로
-- 보이는" 상태가 생긴다. 시각으로 두면 pro_until <= now()인 순간 조회 시점에
-- 자동으로 뱃지가 사라진다 - 움직이는 부품이 0개다. 해제는 null로 비운다.
--
-- 🔴 이 컬럼은 정렬·랭킹·검색 가중치에 절대 들어가면 안 된다(오너 확정 "상위 노출
-- 차별 없음"). listPublicBranches의 order by에도, get_ga_quality_ranking 계열
-- 점수에도 넣지 않는다. 디자인 스펙이 "카드 테두리·배경·정렬에 뱃지 개입 금지"로
-- 같은 원칙을 시각 층에서 한 번 더 막고 있다.
-- =========================================================

alter table public.ga_branch
  add column if not exists pro_until timestamptz;

comment on column public.ga_branch.pro_until is
  'PRO 뱃지 만료 시각. now()보다 미래면 PRO 표시, null이거나 과거면 미표시(조용히 사라짐). 정렬·랭킹에 사용 금지(오너 확정: 상위 노출 차별 없음).';

-- ---------------------------------------------------------
-- 관리자 수동 부여/해제 - 결제 연동이 없으므로(토스 심사 중) 운영팀이 직접 넣는다.
-- p_until이 null이면 해제. 과거 시각을 넣는 것도 사실상 해제와 같아 막지 않는다
-- (실수로 과거를 넣어도 "안 보임"이라는 안전한 방향으로만 틀린다).
-- ---------------------------------------------------------
create or replace function public.admin_set_branch_pro(p_branch_id uuid, p_until timestamptz default null)
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
  if not exists (select 1 from public.ga_branch where id = p_branch_id) then
    raise exception 'BRANCH_NOT_FOUND';
  end if;

  update public.ga_branch set
    pro_until = p_until,
    updated_at = now()
  where id = p_branch_id;
end;
$$;

grant execute on function public.admin_set_branch_pro(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select id, name, pro_until, (pro_until > now()) as is_pro from public.ga_branch where pro_until is not null;
