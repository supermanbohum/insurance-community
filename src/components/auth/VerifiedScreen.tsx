'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackSignupComplete } from '@/lib/analytics/track';

const AUTO_REDIRECT_MS = 3000;

/** /auth/callback이 이메일 인증을 방금 확정한 직후 보여주는 화면 - next로 바로
 * 리다이렉트하지 않고, "인증이 끝났다"는 걸 사용자가 인지할 수 있게 잠깐 멈춘다. */
export function VerifiedScreen({ next }: { next: string }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(AUTO_REDIRECT_MS / 1000));

  useEffect(() => {
    trackSignupComplete();
    const timer = setTimeout(() => {
      router.replace(next);
    }, AUTO_REDIRECT_MS);
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [next, router]);

  return (
    <>
      <span className="text-5xl">🎉</span>
      <h1 className="text-xl font-extrabold tracking-tight text-ink">이메일 인증이 완료되었습니다</h1>
      <p className="text-sm text-ink-faint">
        보험맵 회원가입이 정상적으로 완료되었습니다.
        <br />
        잠시 후 로그인 페이지로 이동합니다. ({secondsLeft}초)
      </p>
      <button
        type="button"
        onClick={() => router.replace(next)}
        className="mt-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
      >
        지금 로그인하기
      </button>
    </>
  );
}
