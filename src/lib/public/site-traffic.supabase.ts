import { createServerSupabaseClient } from '@/lib/supabase/server';

/** 사이트 전역 방문 집계 - (main)/layout.tsx가 모든 공개 페이지 로드마다 호출한다.
 * record_branch_view와 동일한 중복방지(같은 익명 프로필의 재방문 무시) 방식이라
 * 새로고침/연속 탐색을 방문자 수로 과다 집계하지 않는다. */
export async function recordSiteVisit(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.rpc('record_site_visit');
}
