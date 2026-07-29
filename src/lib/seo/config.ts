import { SITE_CONFIG } from '@/lib/config/site';

/** 후행 슬래시 없는 절대 사이트 URL - canonical/OG/JSON-LD 전부 이 값을 기준으로 조립한다. */
export const SITE_URL = SITE_CONFIG.url.replace(/\/$/, '');

export const DEFAULT_META_DESCRIPTION =
  '전국 보험대리점 정보를 한곳에서 확인하세요. 지역별, 보험사별, 채용정보까지 보험맵에서 확인할 수 있습니다.';

/**
 * 검색엔진 사이트 소유 확인(Search Console/네이버 서치어드바이저) 메타 태그.
 * Vercel 환경변수에 값만 등록하면 바로 반영된다 - 값이 없으면 해당 태그를 아예 생략한다
 * (metadata.verification에 undefined를 넘기면 content="undefined"로 그대로 렌더링되므로
 * 반드시 값이 있는 키만 골라서 넘겨야 한다).
 *
 * 등록 방법:
 * - Google Search Console: 속성 추가 > URL 접두어 > HTML 태그 방식 선택 > content 값을
 *   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 환경변수로 등록.
 * - 네이버 서치어드바이저: 사이트 등록 > HTML 태그 방식 선택 > content 값을
 *   NEXT_PUBLIC_NAVER_SITE_VERIFICATION 환경변수로 등록.
 */
export function getVerificationMeta(): { google?: string; other?: Record<string, string> } {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

  const verification: { google?: string; other?: Record<string, string> } = {};
  if (google) verification.google = google;
  if (naver) verification.other = { 'naver-site-verification': naver };
  return verification;
}
