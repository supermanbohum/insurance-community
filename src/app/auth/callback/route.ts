import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AuthProviderType } from '@/types/database';

/**
 * Supabase OAuth(카카오/구글) 콜백. signInWithOAuth의 redirectTo가 여기로 들어온다.
 * 코드를 세션으로 교환한 뒤, users 테이블에 프로필이 없으면 만들어준다
 * (본인 행만 insert 가능하도록 RLS가 막아주므로 anon 클라이언트로 충분하다).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const authUser = data.user;
  const provider: AuthProviderType =
    authUser.app_metadata?.provider === 'google' ? 'google' : authUser.app_metadata?.provider === 'kakao' ? 'kakao' : 'email';

  const { data: existing } = await supabase
    .from('users')
    .select('id, provider, approval_status')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (!existing) {
    // 구글/카카오 OAuth 최초 로그인 - 일반회원(이메일) 가입은 signup_email_member RPC가
    // signUp() 직후(이 콜백이 오기 전) 이미 행을 만들어두므로 여기로 오지 않는다.
    const meta = authUser.user_metadata ?? {};
    const nickname: string = meta.full_name || meta.name || meta.nickname || (authUser.email ? authUser.email.split('@')[0] : '보험맵 회원');
    const profileImage: string | null = meta.avatar_url || meta.picture || null;

    await supabase.from('users').insert({
      auth_user_id: authUser.id,
      email: authUser.email ?? null,
      nickname,
      profile_image: profileImage,
      provider,
    });
  } else if (existing.provider === 'email' && existing.approval_status === 'pending') {
    // 일반회원 이메일 인증 완료 처리 - 링크를 두 번 클릭해도(이미 approved) RPC가
    // 멱등하게 아무 일도 하지 않는다.
    await supabase.rpc('confirm_email_signup');
  }

  return NextResponse.redirect(`${origin}${next}`);
}
