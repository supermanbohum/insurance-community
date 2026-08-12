'use client';

import { useRef } from 'react';
import { unregisterPushTokenAction } from '@/lib/actions/push-tokens';
import { readPushToken, forgetPushToken } from '@/lib/push/session-token';

/**
 * 로그아웃 폼 - 세션을 끊기 전에 **이 기기의 푸시 토큰만** best-effort로 해제한다.
 *
 * 왜 폼을 감쌌나: 로그아웃은 서버 액션(`<form action={...}>`)이라 서버에서 실행되는데,
 * 어떤 기기에서 로그아웃하는지는 서버가 모른다. 토큰을 아는 것은 브라우저뿐이라
 * 여기서 먼저 꺼내 해제하고 그다음에 폼을 제출한다.
 *
 * 🔴 best-effort다 - 해제에 실패해도 로그아웃은 반드시 진행한다. 로그인 상태를
 * 끊는 것이 사용자가 요청한 일이고, 토큰 정리는 부수 작업이다. 실패했다고 로그아웃을
 * 막으면 "로그아웃 버튼이 안 눌리는" 화면이 된다.
 *
 * 🔴 1.5초 타임아웃을 둔다. 앱이 오프라인이거나 서버가 느릴 때 로그아웃이 그만큼
 * 지연되면 사용자는 버튼이 죽은 걸로 읽는다.
 *
 * 🔴 JS가 없거나 이 컴포넌트가 실패해도 폼은 그대로 제출된다(점진적 향상).
 * 그 경우 토큰만 남고 로그아웃은 정상 동작한다 - 반대(로그아웃 실패)보다 낫다.
 *
 * ⚠️ 해제 대상은 이 기기 토큰 하나뿐이다. "그 사용자의 토큰 전부 삭제"는 배제됐다 -
 * 다른 기기의 알림까지 끊는 것은 사용자가 요청하지 않은 일이다.
 */
export function LogoutForm({
  action,
  children,
  className,
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // 해제를 마친 뒤 requestSubmit()으로 다시 제출하는데, 그때 이 핸들러가 또 돌면
  // 무한 루프가 된다. 두 번째 통과는 그냥 흘려보낸다.
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (submittingRef.current) return;

    const token = readPushToken();
    if (!token) return; // 앱이 아니거나 토큰이 없다 - 평소대로 제출된다

    e.preventDefault();
    submittingRef.current = true;

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
    // 실패·타임아웃 어느 쪽이든 finally로 흘러 로그아웃이 진행된다.
    Promise.race([unregisterPushTokenAction(token).then(() => undefined), timeout])
      .catch(() => undefined)
      .finally(() => {
        forgetPushToken();
        formRef.current?.requestSubmit();
      });
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
