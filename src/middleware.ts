import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 모든 요청에서 실행된다.
 * - 세션이 없으면 Supabase Anonymous Auth로 백그라운드 익명 세션을 생성한다.
 * - 사용자는 로그인/회원가입 화면을 전혀 보지 않는다.
 * - /admin 경로는 이 미들웨어에서 익명 세션을 강제하지 않는다 (관리자는 이메일/비밀번호 로그인 사용).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // 관리자 경로는 별도의 이메일/비밀번호 인증을 사용하므로 익명 세션 자동 생성 대상에서 제외.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // 사용자가 인지하지 못하는 사이 백그라운드에서 익명 세션을 발급한다.
    await supabase.auth.signInAnonymously();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 정적 리소스, 이미지 최적화, favicon 등은 제외.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
