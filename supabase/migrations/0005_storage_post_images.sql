-- =========================================================
-- 0005_storage_post_images.sql
-- 게시글 이미지용 Supabase Storage 버킷 + 정책 (Phase 2)
-- 0001~0004 적용 후 실행.
--
-- 경로 규칙: post-images/{post_id}/{random_uuid}.{ext}
--   - post_id는 이미 /post/[id] URL로 공개되는 값이라 폴더명으로 노출돼도 문제 없음.
--   - 원본 파일명, 작성자의 실제 auth UUID는 경로/파일명 어디에도 포함하지 않는다.
--
-- 버킷을 public으로 생성해 다운로드(SELECT)는 RLS 없이 공개 URL로 바로 서빙한다.
-- (게시글 자체가 로그인 없이 누구나 조회 가능하므로 이미지도 동일한 공개 범위로 맞춘다.)
-- 업로드(INSERT)/삭제(DELETE)만 아래 정책으로 제한한다.
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------
-- INSERT: 업로드하려는 경로의 첫 폴더(post_id)가 본인 소유 글일 때만 허용.
--    (글은 create_post()가 status='hidden'으로 먼저 만든 뒤 이미지를 올리므로,
--     이 시점에 posts 행은 이미 존재한다.)
-- ---------------------------------------------------------
create policy "post images: insert by post author"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[1]
        and p.author_id = public.current_profile_id()
    )
  );

-- ---------------------------------------------------------
-- DELETE: 글 작성자 본인 또는 활성 관리자만 삭제 가능.
--   (관리자 로그인 화면은 Phase 4에서 추가 예정이라 지금은 admin_users 매칭이
--    실제로 발생하지 않지만, 구조를 미리 반영해둔다.)
-- ---------------------------------------------------------
create policy "post images: delete by post author or admin"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and (
      exists (
        select 1 from public.posts p
        where p.id::text = (storage.foldername(name))[1]
          and p.author_id = public.current_profile_id()
      )
      or exists (
        select 1 from public.admin_users a
        where a.auth_user_id = auth.uid() and a.is_active
      )
    )
  );

-- UPDATE 정책은 만들지 않는다 (전면 차단) - 이미지 교체는 삭제 후 재업로드로만 처리한다.
