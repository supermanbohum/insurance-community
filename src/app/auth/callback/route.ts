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

  const { data: existing } = await supabase.from('users').select('id').eq('auth_user_id', authUser.id).maybeSingle();

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
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
