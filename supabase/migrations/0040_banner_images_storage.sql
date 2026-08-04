-- =========================================================
-- 0040_banner_images_storage.sql
-- 배너 관리 - public.banners 테이블(0001)과 public_banners 뷰(0002)는 이미 있지만
-- 지금까지 이 스키마를 쓰는 코드가 전혀 없었다(홈 좌측 광고 영역은 정적 "준비 중"
-- placeholder였다). 이번에 관리자 배너 관리 화면 + 홈 좌측(pc_left) 슬롯 연동을
-- 붙이면서, 이미지 업로드용 공개 버킷만 새로 추가한다 - banners 테이블 자체는
-- 스키마 변경이 필요 없다(컬럼/트리거 모두 0001에서 이미 준비되어 있음).
--
-- 0039 적용 후 실행.
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banner-images', 'banner-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "banner images: insert by platform admin"
  on storage.objects for insert
  with check (
    bucket_id = 'banner-images'
    and public.current_admin_id() is not null
  );

create policy "banner images: delete by platform admin"
  on storage.objects for delete
  using (
    bucket_id = 'banner-images'
    and public.current_admin_id() is not null
  );

-- UPDATE 정책은 만들지 않는다(전면 차단) - 교체는 삭제 후 재업로드로만 처리한다(company-logos와 동일 원칙).

-- ---------------------------------------------------------
-- 확인 쿼리
-- ---------------------------------------------------------
-- select * from storage.buckets where id = 'banner-images';
