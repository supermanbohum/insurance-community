-- =========================================================
-- 0003_seed_data.sql
-- 기본 카테고리 / 운영 설정 시드
-- (게시글 작성, 댓글, 추천 등 쓰기 RPC 함수는 Phase 2~4에서 추가됩니다)
-- =========================================================

insert into public.categories (slug, name, description, admin_only_write, sort_order)
values
  ('notice', '공지사항', '운영진 공지사항', true, 0),
  ('issue', '보험이슈', '보험 업계 이슈 및 정보 공유', false, 1),
  ('free', '자유게시판', '자유로운 이야기', false, 2)
on conflict (slug) do nothing;

insert into public.site_settings (key, value)
values
  ('author_name_max_length', '12'::jsonb),
  ('allow_emoji_in_author_name', 'false'::jsonb),
  ('duplicate_view_window_minutes', '30'::jsonb),
  ('post_rate_limit_seconds', '60'::jsonb),
  ('post_daily_limit', '20'::jsonb),
  ('comment_rate_limit_seconds', '10'::jsonb),
  ('comment_daily_limit', '100'::jsonb),
  ('report_daily_limit', '30'::jsonb),
  ('image_max_size_mb', '5'::jsonb),
  ('image_max_count_per_post', '5'::jsonb),
  ('best_min_upvotes', '5'::jsonb),
  ('best_min_score_diff', '3'::jsonb),
  ('best_max_reports', '5'::jsonb),
  ('auto_hide_report_threshold', '5'::jsonb),
  ('site_name', '"보험설계사 익명 커뮤니티"'::jsonb)
on conflict (key) do nothing;
