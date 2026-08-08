import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listGaFilterOptions } from '@/lib/public/ga-directory';
import { SignupForm } from '@/components/auth/SignupForm';
import { KakaoSignupGate } from '@/components/auth/KakaoSignupGate';
import { BrandMark } from '@/components/brand/BrandMark';

// 배포 게이트(CTO, 2026-08-08): /privacy 카카오 조항 반영·종단 재로그인 확인·FAQ 문구
// 치환이 끝나기 전까지는 절대 켜지 않는다 - /login의 카카오 버튼과 반드시 같은 플래그로
// 묶는다(하나만 켜면 카카오로 가입한 사람이 로그인을 못 하는 잠금 사고가 난다).
const KAKAO_SIGNUP_ENABLED = process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === 'true';

/**
 * 오너 지시(2026-08-08): 회원가입은 카카오 인증을 통과해야만 열린다. 카카오 인증이
 * 기존 이메일 인증을 대체하므로, is_full_member() 등 정회원 판정 로직은 그대로 두고
 * (0077) 이 페이지의 분기만 바뀐다:
 *   1) 세션 없음 - 카카오 버튼만 노출(KakaoSignupGate)
 *   2) 카카오 세션 + 프로필 없음 - 회원가입 폼(kakaoMode, /auth/callback이 이리로 보냄)
 *   3) 그 외 이미 정회원 - next로(재가입 시도 = 로그인 처리, /auth/callback이 이미 대부분 걸러줌)
 */
export default async function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  // next는 "/"로 시작하는 내부 경로만 허용한다 - 외부 URL을 넘기는 오픈 리다이렉트를 막기 위함.
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/my';

  const user = await getCurrentUser();
  if (user) {
    redirect(next);
  }

  const gaOptions = await listGaFilterOptions();

  if (!KAKAO_SIGNUP_ENABLED) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
            <BrandMark className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-ink">일반 회원가입</h1>
          <p className="text-sm text-ink-faint">가입 완료(이메일 인증) 후 실시간 채팅, 지점등록, TOP설계사 등록을 이용할 수 있어요.</p>
        </div>

        <div className="w-full max-w-sm">
          <SignupForm gaOptions={gaOptions} next={next} />
        </div>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const isKakaoAwaitingProfile = Boolean(authUser && authUser.app_metadata?.provider === 'kakao');

  if (isKakaoAwaitingProfile) {
    const meta = authUser!.user_metadata ?? {};
    const kakaoNickname: string = meta.full_name || meta.name || meta.nickname || '';

    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
            <BrandMark className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-ink">회원가입</h1>
          <p className="text-sm text-ink-faint">카카오 인증이 완료되었습니다. 나머지 정보를 입력하면 가입이 끝나요.</p>
        </div>

        <div className="w-full max-w-sm">
          <SignupForm gaOptions={gaOptions} next={next} kakaoMode kakaoNickname={kakaoNickname} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop">
          <BrandMark className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">회원가입</h1>
        <p className="text-sm text-ink-faint">가입 완료 후 실시간 채팅, 지점등록, TOP설계사 등록을 이용할 수 있어요.</p>
      </div>

      <KakaoSignupGate next={next} />
    </div>
  );
}
