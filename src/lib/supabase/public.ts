import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * 로그인 여부와 무관한 공개 조회 전용 클라이언트. cookies()를 전혀 건드리지 않아
 * (createServerSupabaseClient와 달리) Next.js가 이 값을 쓰는 페이지를 자동으로
 * force-dynamic 처리하지 않는다 - 홈/검색/지도처럼 캐시(ISR)를 쓰고 싶은 페이지의
 * 순수 공개 데이터 조회(승인된 GA/지점 목록 등)에만 사용한다.
 * 개인화된 조회(조회수 기록, 관리자/파트너 세션 필요한 조회)에는 쓰지 않는다.
 */
export function createPublicSupabaseClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
