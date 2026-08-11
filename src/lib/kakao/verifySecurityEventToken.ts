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
  | { ok: true; claims: SetClaims; reason: string | null }
  | { ok: false; error: string };

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

  // events는 { "<이벤트 URI>": { reason: "..." } } 모양이다. 이벤트 URI가 늘어날 수
  // 있어 키를 특정하지 않고 첫 항목의 reason을 꺼낸다 - 모르는 이벤트가 와도
  // 기록은 남아야 하기 때문이다(판단은 로그를 보고 사람이 한다).
  const firstEvent = claims.events ? Object.values(claims.events)[0] : undefined;
  return { ok: true, claims, reason: firstEvent?.reason ?? null };
}
