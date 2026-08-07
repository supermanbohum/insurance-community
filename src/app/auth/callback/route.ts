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

  if (provider === 'email') {
    // 일반회원(이메일) 가입 - 프로필(public.users) 생성 자체를 이 시점(실제 세션이 있어
    // auth.uid()가 유효함이 보장되는 시점)으로 미뤘다. 최초 인증 링크 클릭이면 프로필을
    // 새로 만들고, 이미 만들어진 뒤 링크를 두 번 클릭한 거면 멱등하게 기존 행을 반환한다.
    const { error: confirmError } = await supabase.rpc('confirm_email_signup');
    if (confirmError) {
      console.error('[auth/callback] confirm_email_signup 실패:', confirmError);
      return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
    }
    // 인증 직후 바로 next로 넘기지 않고, "인증 완료" 안내 화면을 한 번 보여준 뒤
    // 그 화면에서 next로 이동시킨다(사용자가 방금 무슨 일이 일어났는지 알 수 있게).
    return NextResponse.redirect(`${origin}/auth/verified?next=${encodeURIComponent(next)}`);
  } else {
    // 구글/카카오 OAuth 최초 로그인 - 이미 프로필이 있으면(재로그인) 아무 것도 하지 않는다.
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (!existing) {
      const meta = authUser.user_metadata ?? {};
      const nickname: string = meta.full_name || meta.name || meta.nickname || (authUser.email ? authUser.email.split('@')[0] : '보험맵 회원');
      const profileImage: string | null = meta.avatar_url || meta.picture || null;

      await supabase.from('users').insert({
        auth_user_id: authUser.id,
        email: authUser.email ?? null,
        nickname,
        profile_image: profileImage,
        provider,
        // 카카오는 정회원으로 인정한다(W-033, 0061) - 카카오가 이미 검증해 넘긴 연락처를
        // 그대로 저장한다(우리 쪽 별도 인증 절차 없음). 구글은 여전히 탐색 전용이라 null 유지.
        kakao_verified_contact: provider === 'kakao' ? authUser.email ?? meta.phone_number ?? null : null,
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
