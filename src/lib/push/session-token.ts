/**
 * 앱이 브릿지로 넘겨준 Expo Push Token을 브라우저 세션에 보관한다.
 *
 * 왜 보관하는가: 로그아웃할 때 그 기기의 토큰만 골라 해제해야 하는데, 서버는 어떤
 * 기기에서 로그아웃하는지 모른다. 토큰을 아는 것은 브라우저(WebView)뿐이라 여기에
 * 둔다. 예전에는 BoheomBridge가 등록 후 토큰을 그냥 버려서, 로그아웃 시 해제할
 * 대상을 알 방법이 없었다(`unregisterPushTokenAction` 호출부 0건 상태였다).
 *
 * 🔴 "그 사용자의 토큰을 전부 삭제"는 하지 않는다(오너·CTO 확정). 한 기기에서
 * 로그아웃했다고 다른 기기의 알림까지 끊으면, 사용자가 하지 않은 일이 일어난다.
 * 해제 대상은 **지금 로그아웃하는 이 기기의 토큰 하나뿐**이다.
 *
 * 🔴 localStorage가 아니라 sessionStorage인 이유: 이 값은 "지금 이 세션에서 쓰는
 * 기기 토큰"이고 로그인 세션과 수명을 같이 해야 한다. localStorage에 두면 탭을 닫고
 * 한참 뒤에 열어도 남아 있어, 이미 무효해진 토큰을 해제하려 들거나 다른 계정의
 * 로그아웃에 끼어들 수 있다.
 *
 * ⚠️ 토큰 자체는 비밀이 아니다(알림을 보낼 수 있는 주소값이다). 다만 이 값을 아는
 * 쪽이 `unregister_push_token`으로 삭제할 수 있으므로(0046 RPC에 소유권 검사가 없다)
 * 필요 이상으로 오래 들고 있지 않는다.
 */
const KEY = 'boheom.push-token';

/** 서버 렌더링·비브라우저 환경에서 조용히 무시된다(브릿지·로그아웃 양쪽에서 호출된다). */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // 시크릿 모드·정책 차단 등으로 접근 자체가 throw할 수 있다. 저장 실패가 로그인
    // 흐름을 깨면 안 되므로 삼킨다 - 이 값이 없으면 해제를 건너뛸 뿐이다.
    return null;
  }
}

export function rememberPushToken(token: string): void {
  const s = storage();
  if (!s || !token.trim()) return;
  try {
    s.setItem(KEY, token.trim());
  } catch {
    /* 저장 실패는 무시한다 - 해제를 못 할 뿐 로그인/알림 등록에는 영향이 없다 */
  }
}

export function readPushToken(): string | null {
  const s = storage();
  if (!s) return null;
  try {
    const v = s.getItem(KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function forgetPushToken(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
