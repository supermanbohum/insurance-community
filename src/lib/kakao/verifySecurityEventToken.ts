import 'server-only';

/**
 * 카카오 "계정 상태 변경 웹훅"이 보내는 Security Event Token(SET)을 검증한다.
 *
 * 카카오는 본문에 JWT를 담아 보내고(Content-Type: application/secevent+jwt),
 * 수신자는 카카오 공개키(OIDC)로 서명을 검증해야 한다.
 *
 * 🔴 구식 「연결 해제 웹훅」은 쓰지 않는다. 그쪽 검증은 카카오가 우리 어드민 키를
 * 헤더에 담아 보내주면 대조하는 방식인데, PRIMARY ADMIN KEY는 카카오 API 전 권한을
 * 가진 키다. 인증 수단으로 최고 권한 키를 매 요청 유통시키는 구조라 배제했다(CTO 승인).
 *
 * 🔴 외부 JWT 라이브러리를 쓰지 않고 Web Crypto로 검증한다. 이 한 엔드포인트를 위해
 * 의존성을 늘릴 이유가 없고, 신규 라이브러리는 사전 보고 대상이다.
 */

const KAKAO_JWKS_URL = 'https://kauth.kakao.com/.well-known/jwks.json';
const KAKAO_ISSUER = 'https://kauth.kakao.com';

interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

export interface SetClaims {
  iss?: string;
  aud?: string;
  /** 카카오 회원번호. auth.identities.provider_id와 같은 값이다. */
  sub?: string;
  iat?: number;
  jti?: string;
  events?: Record<string, { reason?: string } | undefined>;
  [key: string]: unknown;
}

export type VerifyResult =
  | { ok: true; claims: SetClaims; reason: string | null; eventUris: string[] }
  | { ok: false; error: string };

/**
 * 🔴 탈퇴 처리 대상 이벤트. 카카오 문서 원문에서 확인한 값이다(추측 금지 - 문자열
 * 하나만 틀려도 아무 이벤트도 안 걸리거나 엉뚱한 이벤트가 걸린다).
 * 출처: 카카오 로그인 > 웹훅 > 변경 이벤트 타입
 *
 *   user-unlinked  "사용자가 앱과 연결 해제"
 *                  권장 조치: "사용자 회원 정보의 카카오 로그인 연동을 해제하거나,
 *                  카카오 로그인으로만 이용 가능한 경우에는 회원 탈퇴 처리"
 *                  → 우리가 정확히 후자다(카카오 가입자는 비밀번호가 없다).
 *   account-purged "계정 탈퇴"
 *                  권장 조치: "사용자 계정 삭제 또는 다른 로그인 방법 제공"
 *
 * ⚠️ account-purged는 RISC 카테고리라 「카카오계정 상태 변경 내역」 동의항목을
 * 설정하고 사용자가 동의한 경우에만 옵니다(권한 자체를 데브톡으로 신청해야 함).
 * 지금 우리 앱은 그 동의항목이 없으므로 실제로 도달하는 것은 user-unlinked뿐이다.
 * 그래도 목록에 넣어 둔다 - 나중에 동의항목이 열렸을 때 조용히 누락되지 않도록.
 */
export const WITHDRAW_EVENT_URIS = [
  'https://schemas.openid.net/secevent/oauth/event-type/user-unlinked',
  'https://schemas.openid.net/secevent/risc/event-type/account-purged',
] as const;

/**
 * 🔴 처리 대상이 아닌 이벤트를 "모르는 이벤트"로 뭉뚱그리지 않는다.
 * 콘솔에서 켤 수 있는 이벤트 전체 목록이며, 이 중 어느 것이 와도 탈퇴시키지 않는다.
 * 특히 user-linked(앱 연결)와 user-scope-consent(동의)는 **가입/연결하는 순간** 오는
 * 이벤트라, 이것을 탈퇴로 처리하면 방금 가입한 사람을 그 자리에서 탈퇴시킨다.
 */
export const KNOWN_NON_WITHDRAW_EVENT_URIS = [
  'https://schemas.openid.net/secevent/oauth/event-type/user-linked',
  'https://schemas.openid.net/secevent/oauth/event-type/user-scope-consent',
  'https://schemas.openid.net/secevent/oauth/event-type/user-scope-withdraw',
  'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
  'https://schemas.openid.net/secevent/oauth/event-type/token-issued',
  'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  'https://schemas.openid.net/secevent/risc/event-type/credential-compromise',
  'https://schemas.openid.net/secevent/risc/event-type/identifier-changed',
  'https://schemas.openid.net/secevent/risc/event-type/identifier-recycled',
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  'https://schemas.openid.net/secevent/caep/event-type/assurance-level-change',
  'https://schemas.openid.net/secevent/caep/event-type/credential-change',
  'https://schemas.kakao.com/platevent/kakao/event-type/user-profile-changed',
] as const;

/**
 * 🔴 기본값은 "처리하지 않는다"다. 목록에 있는 것만 탈퇴시킨다.
 * 카카오가 이벤트를 추가해도 우리는 조용히 아무것도 하지 않는다 - 모르는 이벤트에
 * 사용자를 탈퇴시키는 것보다 놓치는 쪽이 압도적으로 안전하다.
 */
export function shouldWithdraw(eventUris: string[]): boolean {
  return eventUris.some((uri) => (WITHDRAW_EVENT_URIS as readonly string[]).includes(uri));
}

function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function base64UrlToJson<T>(input: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(input))) as T;
  } catch {
    return null;
  }
}

// 공개키는 자주 바뀌지 않지만 회전은 한다. 요청마다 받아오면 3초 응답 제한에 불리하고,
// 영구 캐시하면 회전 시 검증이 통째로 실패한다 - 10분만 들고 있는다.
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getKakaoJwks(forceRefresh = false): Promise<Jwk[]> {
  if (!forceRefresh && jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(KAKAO_JWKS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`JWKS_FETCH_FAILED_${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: body.keys ?? [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

async function verifySignature(jwk: Jwk, signingInput: string, signature: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature as unknown as ArrayBuffer,
    new TextEncoder().encode(signingInput) as unknown as ArrayBuffer
  );
}

/**
 * 실패 사유를 문자열로 구분해 돌려준다 - 로그에 그대로 남겨야 나중에 "왜 안 됐는지"를
 * 알 수 있다. 🔴 어떤 실패든 성공으로 넘기지 않는다. 검증 없이 받으면 아무나 남의
 * 계정을 탈퇴시킬 수 있다.
 */
export async function verifyKakaoSecurityEventToken(rawToken: string): Promise<VerifyResult> {
  const token = rawToken.trim();
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'MALFORMED_JWT' };

  const header = base64UrlToJson<{ kid?: string; alg?: string }>(parts[0]);
  const claims = base64UrlToJson<SetClaims>(parts[1]);
  if (!header || !claims) return { ok: false, error: 'MALFORMED_JWT' };
  if (header.alg !== 'RS256') return { ok: false, error: `UNSUPPORTED_ALG_${header.alg ?? 'NONE'}` };
  if (!header.kid) return { ok: false, error: 'MISSING_KID' };

  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlToBytes(parts[2]);

  // 키 회전 직후에는 캐시에 없는 kid가 올 수 있다 - 그때 한 번만 다시 받아온다.
  let keys = await getKakaoJwks();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getKakaoJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) return { ok: false, error: 'UNKNOWN_KID' };

  let valid = false;
  try {
    valid = await verifySignature(jwk, signingInput, signature);
  } catch {
    return { ok: false, error: 'SIGNATURE_VERIFY_ERROR' };
  }
  if (!valid) return { ok: false, error: 'INVALID_SIGNATURE' };

  // 서명이 맞아도 "우리에게 온 것"인지 따로 봐야 한다. 카카오가 서명한 다른 앱의
  // 토큰을 그대로 우리 엔드포인트에 밀어 넣는 경우를 서명만으로는 막지 못한다.
  if (claims.iss !== KAKAO_ISSUER) return { ok: false, error: 'BAD_ISSUER' };

  const expectedAud = process.env.KAKAO_REST_API_KEY;
  if (!expectedAud) return { ok: false, error: 'MISSING_KAKAO_REST_API_KEY' };
  if (claims.aud !== expectedAud) return { ok: false, error: 'BAD_AUDIENCE' };

  if (!claims.sub) return { ok: false, error: 'MISSING_SUB' };

  // events는 { "<이벤트 URI>": {...} } 모양이고, 한 SET에 여러 이벤트가 담길 수 있다.
  // 🔴 URI를 그대로 돌려준다. 예전에는 reason만 꺼내고 "어떤 이벤트인지"는 아예 보지
  // 않았는데, 그 상태로는 라우트가 연결(user-linked)과 연결 해제(user-unlinked)를
  // 구분할 수 없어 **가입한 사람을 탈퇴시켰다.**
  const eventUris = claims.events ? Object.keys(claims.events) : [];
  // reason은 user-unlinked에만 있다(ACCOUNT_DELETE·UNLINK_FROM_APPS 등 7종).
  // 값이 늘어날 수 있으므로 문자열 그대로 로그에 남기고 판단에는 쓰지 않는다.
  const firstEvent = claims.events ? Object.values(claims.events)[0] : undefined;
  return { ok: true, claims, reason: firstEvent?.reason ?? null, eventUris };
}
