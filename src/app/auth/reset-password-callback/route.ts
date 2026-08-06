import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 비밀번호 재설정 이메일 링크 전용 콜백 - resetPasswordForEmail의 redirectTo가 여기로
 * 들어온다. /auth/callback과 코드 교환 로직은 동일하지만, 그 라우트의 email 분기가
 * 하는 confirm_email_signup(가입 인증 전용 RPC) 호출을 절대 함께 태우면 안 되므로
 * 별도 라우트로 분리한다 - 세션만 확립하고 새 비밀번호 입력 화면으로 보낸다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/reset-password?error=missing_code`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/reset-password?error=expired`);
  }

  return NextResponse.redirect(`${origin}/reset-password/confirm`);
}
