'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';

export async function logoutAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}

/** 카카오/구글 등 비이메일 프로바이더로 로그인했지만 정회원 전환 경로가 없는 계정이
 * 이메일 계정으로 새로 가입하도록 유도할 때 쓴다(VerifyEmailScreen) - 기존 세션을
 * 로그아웃해야 /signup에서 새 이메일 계정을 정상적으로 만들 수 있다. */
export async function logoutThenGoToSignupAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/signup');
}

export type ActionResult = { success: true } | { success: false; error: string };

/** 오너 지시(2026-08-08) - 회원가입은 카카오 인증을 통과해야 열린다. 이 시점엔 이미
 * 카카오 OAuth 세션이 있고(auth.uid() 유효), 회원가입 폼에서 받은 값으로 프로필을
 * 완성한다 - complete_kakao_signup()(0077)이 kakao_verified_contact에 폼의 연락처를
 * 넣어 즉시 정회원으로 만든다(is_full_member() 수정 없이 그대로 작동). */
export async function completeKakaoSignupAction(input: {
  username: string;
  name: string;
  email: string;
  contact: string;
  gaCompanyId: string;
}): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('complete_kakao_signup', {
    p_username: input.username.trim(),
    p_name: input.name.trim(),
    p_email: input.email.trim(),
    p_contact: input.contact.trim(),
    p_ga_company_id: input.gaCompanyId,
  });

  if (error) {
    const message = error.message.includes('USERNAME_TAKEN')
      ? '이미 사용 중인 아이디입니다.'
      : error.message.includes('INVALID_USERNAME')
        ? '아이디를 3자 이상 입력해주세요.'
        : error.message.includes('INVALID_GA_COMPANY')
          ? '소속 GA를 검색해서 선택해주세요.'
          : error.message.includes('NOT_KAKAO_SESSION')
            ? '카카오 인증이 필요합니다.'
            : error.message.includes('NOT_AUTHENTICATED')
              ? '로그인이 필요합니다.'
              : '입력값을 확인해주세요.';
    return { success: false, error: message };
  }
  return { success: true };
}

/** 마이페이지 - 비밀번호 변경. 재인증(현재 비밀번호 확인) 후 Supabase Auth의
 * updateUser()로 바꾼다 - 별도 RPC 없이 Supabase Auth 기능을 그대로 쓴다. */
export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 8) {
    return { success: false, error: '새 비밀번호는 8자 이상이어야 합니다.' };
  }

  const user = await requireUser();
  const supabase = createServerSupabaseClient();

  if (!user.email) {
    return { success: false, error: '이메일 계정만 비밀번호를 변경할 수 있습니다.' };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (reauthError) {
    return { success: false, error: '현재 비밀번호가 일치하지 않습니다.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { success: false, error: '비밀번호를 변경하지 못했습니다.' };
  }

  return { success: true };
}
