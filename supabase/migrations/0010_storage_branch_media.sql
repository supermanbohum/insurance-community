-- =========================================================
-- 0010_storage_branch_media.sql
-- 지점 미디어용 Supabase Storage 버킷 + 정책 (Phase 4 선행 작업)
-- 0006~0008 적용 후 실행.
--
-- 경로 규칙 (향후 CDN 확장을 고려해 회사/지점 단위로 폴더를 분리):
--   branch-images/{company_id}/{branch_id}/{random_uuid}.{ext}
--   branch-videos/{company_id}/{branch_id}/{random_uuid}.{ext}
--   company-logos/{company_id}/{random_uuid}.{ext}
--
-- branch_media.source='external'(유튜브 링크 등)인 경우는 이 버킷을 쓰지 않는다.
-- 버킷을 public으로 생성해 다운로드(SELECT)는 RLS 없이 공개 URL로 바로 서빙한다
-- (post-images와 동일 원칙 - 0005 참고).
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('branch-images', 'branch-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']), -- 5MB
  ('branch-videos', 'branch-videos', true, 209715200, array['video/mp4', 'video/webm', 'video/quicktime']), -- 200MB
  ('company-logos', 'company-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']) -- 2MB
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------
-- branch-images / branch-videos
--   경로의 두 번째 폴더가 branch_id. 플랫폼 관리자이거나 해당 지점을 관리하는
--   GA 관리자(is_ga_admin_for_branch)만 업로드/삭제할 수 있다.
--   첫 번째 폴더(company_id)는 표시/CDN 캐시 분리용이며 권한 판단에는 branch_id만 사용한다
--   (branch_id -> ga_company_id는 is_ga_admin_for_branch 내부에서 이미 검증됨).
-- ---------------------------------------------------------
create policy "branch media: insert by platform or ga admin"
  on storage.objects for insert
  with check (
    bucket_id in ('branch-images', 'branch-videos')
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[2])::uuid)
    )
  );

create policy "branch media: delete by platform or ga admin"
  on storage.objects for delete
  using (
    bucket_id in ('branch-images', 'branch-videos')
    and (
      public.current_admin_id() is not null
      or public.is_ga_admin_for_branch(((storage.foldername(name))[2])::uuid)
    )
  );

-- ---------------------------------------------------------
-- company-logos
--   ga_company 신원 정보는 플랫폼 관리자 전용(update_ga_company)이므로 로고도 동일하게 제한.
-- ---------------------------------------------------------
create policy "company logos: insert by platform admin"
  on storage.objects for insert
  with check (
    bucket_id = 'company-logos'
    and public.current_admin_id() is not null
  );

create policy "company logos: delete by platform admin"
  on storage.objects for delete
  using (
    bucket_id = 'company-logos'
    and public.current_admin_id() is not null
  );

-- UPDATE 정책은 만들지 않는다 (전면 차단) - 교체는 삭제 후 재업로드로만 처리한다 (0005와 동일 원칙).
