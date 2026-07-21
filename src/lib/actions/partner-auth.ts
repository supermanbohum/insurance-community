'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { IS_MOCK_MODE } from '@/lib/mock/config';
import { mockStore } from '@/lib/mock/store';
import { PARTNER_SESSION_COOKIE } from '@/lib/partner/session';

export type ActionResult = { success: true } | { success: false; error: string };

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function signupPartnerAction(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!email || !input.password || !displayName) {
    return { success: false, error: '모든 항목을 입력해주세요.' };
  }
  if (input.password.length < 8) {
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다.' };
  }

  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  if (mockStore.gaAdminUsers.some((g) => g.email === email)) {
    return { success: false, error: '이미 가입된 이메일입니다.' };
  }

  const now = mockStore.nowIso();
  const partner = {
    id: mockStore.genId('gaadmin'),
    ga_company_id: null,
    branch_id: null,
    email,
    // Mock 전용 평문 비밀번호. 실제 배포 전 Supabase Auth로 완전히 교체해야 한다.
    password: input.password,
    display_name: displayName,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  mockStore.gaAdminUsers.push(partner);

  cookies().set(PARTNER_SESSION_COOKIE, partner.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return { success: true };
}

export async function loginPartnerAction(input: { email: string; password: string }): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();

  if (!IS_MOCK_MODE) {
    return { success: false, error: '현재 준비 중인 기능입니다.' };
  }

  const partner = mockStore.gaAdminUsers.find((g) => g.email === email && g.is_active);
  if (!partner || partner.password !== input.password) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  cookies().set(PARTNER_SESSION_COOKIE, partner.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return { success: true };
}

export async function logoutPartnerAction(): Promise<void> {
  cookies().delete(PARTNER_SESSION_COOKIE);
  redirect('/partner/login');
}
