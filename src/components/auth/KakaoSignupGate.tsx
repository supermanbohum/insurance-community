'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * /signup의 첫 화면(오너 지시, 2026-08-08) - "무조건 카카오톡으로 인증을 하고 나야
 * 회원가입 페이지가 뜨게끔" - 이 버튼만 보이고, 통과해야 기존 회원가입 폼이 열린다.
 * 인증 완료 후 프로필이 없으면 /auth/callback이 다시 /signup으로 돌려보내는데, 그때는
 * 카카오 세션이 이미 있으므로 이 게이트가 아니라 SignupForm(kakaoMode)이 뜬다.
 */
export function KakaoSignupGate({ next }: { next: string }) {
  const { login, isPending } = useAuth();

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
      <div>
        <p className="text-sm font-bold text-ink">카카오 인증 후 가입을 진행합니다</p>
        <p className="mt-1 text-xs text-ink-faint">카카오톡으로 본인 확인 후, 나머지 정보를 입력하면 가입이 완료됩니다.</p>
      </div>
      <Button
        type="button"
        size="lg"
        className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FEE500]/90"
        disabled={isPending}
        onClick={() => login('kakao', next)}
      >
        {isPending ? '이동 중...' : '카카오톡으로 1분 로그인'}
      </Button>
    </div>
  );
}
