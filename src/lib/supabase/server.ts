import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * 서버 컴포넌트 / 서버 액션 / Route Handler에서 사용하는 Supabase 클라이언트.
 * 사용자의 익명 세션 쿠키를 읽어 RLS가 적용된 요청을 수행한다.
 * anon key만 사용 - service role key는 여기서 사용하지 않는다.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // 서버 컴포넌트(read-only)에서 호출된 경우 무시.
            // 실제 세션 쓰기는 middleware 또는 Route Handler에서 수행됨.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // 위와 동일한 이유로 무시.
          }
        },
      },
    }
  );
}
