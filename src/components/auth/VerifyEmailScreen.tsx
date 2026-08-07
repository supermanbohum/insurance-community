'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import type { AuthProviderType } from '@/types/database';

const RESEND_COOLDOWN_MS = 30_000;

/**
 * /verify-email 화면(W-034). "로그인은 됐지만 이메일 인증은 안 한" 사용자에게 실제로
 * 할 수 있는 행동(재발송)을 준다 - 예전엔 이 상태에서 /login으로 튕겨 빈 화면만 봤다.
 * provider가 email이 아닌 경우(카카오/구글, W-033 이후 발생 가능)는 재발송 대상 이메일이
 * 없으므로 재발송 버튼 없이 안내 문구만 보여준다.
 */
export function VerifyEmailScreen({
  email,
  provider,
  next,
}: {
  email: string | null;
  provider: AuthProviderType;
  next: string;
}) {
  const router = useRouter();
  const { resendVerificationEmail, isPending } = useAuth();
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const onCooldown = cooldownUntil > Date.now();

  async function handleResend() {
    if (!email) return;
    const result = await resendVerificationEmail(email, next);
    if (!result.success) {
      toast.error(result.error ?? '인증 메일을 다시 보내지 못했습니다.');
      return;
    }
    toast.success('인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.');
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
  }

  return (
    <>
      <span className="text-5xl">📬</span>
      <h1 className="text-xl font-extrabold tracking-tight text-ink">이메일 인증이 필요합니다</h1>
      {provider === 'email' ? (
        <>
          <p className="text-sm text-ink-faint">
            {email ? <span className="font-semibold text-ink">{email}</span> : '가입하신 이메일'}로 보낸 인증 메일의 링크를
            클릭하면 이 기능을 사용할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending || onCooldown || !email}
            className="mt-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {onCooldown ? '잠시 후 다시 시도해주세요' : isPending ? '보내는 중...' : '인증 메일 재발송'}
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="text-xs font-semibold text-ink-faint underline underline-offset-2 hover:text-ink"
          >
            인증을 완료하셨나요? 새로고침
          </button>
        </>
      ) : (
        <p className="text-sm text-ink-faint">
          계정 인증이 아직 완료되지 않았습니다. 고객센터로 문의해주세요.
        </p>
      )}
    </>
  );
}
