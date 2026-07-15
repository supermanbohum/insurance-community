import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * service role key를 사용하는 관리자 전용 클라이언트.
 *
 * 절대 클라이언트 컴포넌트나 브라우저로 전달하지 않는다.
 * 'server-only' 패키지를 import하여, 실수로라도 클라이언트 번들에 포함되면
 * 빌드 타임에 에러가 발생하도록 강제한다.
 *
 * 이 클라이언트는 다음 용도로만 사용한다:
 * - 관리자 인증 확인 후 수행하는 관리자 전용 작업 (수치 보정, 배너 관리 등)
 * - RLS를 우회해야 하는 서버 집계 작업 (베스트 랭킹 재계산 등)
 *
 * 이 클라이언트를 사용하는 모든 함수는 반드시 호출 전 관리자 세션과 권한을
 * 별도로 검증해야 한다 (requireAdmin 참고).
 */
let cached: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.'
    );
  }

  cached = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
