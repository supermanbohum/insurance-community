-- =========================================================
-- 0054_add_community_categories.sql
-- 커뮤니티 게시판에 4개 카테고리를 추가한다(질문/보험정보/GA이직/신입). "베스트"는
-- 카테고리가 아니라 posts.auto_best_score/best_override_status로 계산되는
-- 화면이라 여기 포함하지 않는다. "후기"는 이미 0018에서 review 슬러그로 존재한다.
-- 정식 사이트 구조 변경이라 시드 스크립트(supabase/seed_dummy_data.sql)가 아니라
-- 번호가 매겨진 마이그레이션으로 관리한다 - 재실행해도 안전(on conflict do nothing).
-- =========================================================
insert into public.categories (slug, name, description, admin_only_write, sort_order)
values
  ('question', '질문', '보험/GA 관련 질문 게시판', false, 4),
  ('info', '보험정보', '보험 상품/제도 정보 공유', false, 5),
  ('ga_move', 'GA이직', 'GA 이직 정보 및 후기', false, 6),
  ('newcomer', '신입', '신입 설계사를 위한 게시판', false, 7)
on conflict (slug) do nothing;
