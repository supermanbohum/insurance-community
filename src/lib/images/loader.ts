/**
 * next/image 커스텀 로더 — 이미지 변환을 Vercel이 아니라 Supabase에서 한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사고 (2026-09-03): 사이트의 **모든 이미지**가 안 보였다
 * ─────────────────────────────────────────────────────────────────────────────
 * 오너 신고는 「더블유에셋 새 지점 사진이 안 보인다」였지만 그 지점만의 문제가 아니었다.
 *   DB 6행 정상 · 스토리지 파일 6개 정상 · 원본 URL은 HTTP 200
 *   그런데 `/_next/image?url=...` 이 **HTTP 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED**
 *   자체 정적 아이콘(`/icon.png`)까지 402였다 → 지점 무관, 사이트 전역.
 *
 * 원인: Vercel Hobby 플랜의 **Image Optimization - Transformations 5,000/월을 100% 소진**
 *       (콘솔 실측 `5K / 5K`). 소진되면 최적화 요청이 402로 떨어지고 이미지가 통째로 죽는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 `unoptimized: true` 가 아니라 이 방법인가
 * ─────────────────────────────────────────────────────────────────────────────
 * `unoptimized: true` 는 한 줄이고 확실하지만 **원본을 그대로 내려보낸다.**
 * 실측(2026-09-03): branch-images 97장 / 214MB / **평균 2.26MB**, 68장이 2MB 초과.
 * 지점 상세 한 페이지가 사진 6장이면 **13MB**다. 88px 썸네일에 2MB를 받는다는 뜻이고,
 * Supabase Free 의 egress 5GB/월은 그런 페이지 400회 조회에 바닥난다.
 * **「안 보인다」를 「보이지만 요금·대역폭이 터진다」로 바꾸는 것**이라 채택하지 않았다.
 *
 * 대신 Supabase Storage의 `render/image` 변환을 쓴다. 같은 파일 실측:
 *   원본 3.07MB → width=128 50KB · 400 154KB · 800 289KB · 1600 554KB
 *   Accept: image/webp 를 보내면 **WebP 150KB** 로 내려온다(포맷 협상 자동)
 * 즉 폭에 비례해 실제로 리사이즈되며, Vercel 변환은 **0회** 발생한다.
 *
 * ⚠️ 확인해 둘 것 두 가지
 *   1. 우리 Supabase 조직은 **Free Plan**이다(대시보드 실측). 공식 문서는 이미지 변환을
 *      Pro 이상으로 안내하는데 **실제로는 200으로 동작한다**(위 수치가 근거).
 *      혹시 나중에 막히면 증상은 이미지 전역 실패로 똑같이 나타난다.
 *      그때의 대피로는 **이 파일에서 src 를 그대로 반환**하는 것 하나뿐이다(원본 직행).
 *      next.config 를 건드릴 필요 없이 여기만 고치면 된다.
 *   2. 폭 상한을 넘겨도(width=3840) 에러가 아니라 원본 크기로 수렴한다 — 실측 확인.
 *      그래서 deviceSizes 에 큰 값이 남아 있어도 이미지가 깨지지 않는다.
 */

/** Supabase 공개 오브젝트 URL의 표식. 이 경로를 변환 엔드포인트로 바꾼다. */
const PUBLIC_OBJECT = '/storage/v1/object/public/';

/** Supabase가 받는 quality 범위. 벗어나면 400이 나므로 호출부 값을 그대로 믿지 않는다. */
const MIN_QUALITY = 20;
const MAX_QUALITY = 100;
const DEFAULT_QUALITY = 70;

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // 🔴 로더는 **모든** next/image 에 적용된다 — 로컬 파일(`/icon.png`), static import
  //    (`/_next/static/media/...`), 외부 호스트(picsum 등)까지 전부 여기를 지난다.
  //    Supabase 공개 오브젝트가 아니면 **손대지 않고 그대로 돌려준다.**
  //    (여기서 잘못 만지면 로고·아이콘이 전부 깨진다.)
  const marker = src.indexOf(PUBLIC_OBJECT);
  if (marker === -1) return src;

  const origin = src.slice(0, marker);
  // 쿼리스트링이 붙어 온 경우 변환 파라미터와 충돌하지 않게 떼어낸다.
  const path = src.slice(marker + PUBLIC_OBJECT.length).split('?')[0];

  const q = Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(quality ?? DEFAULT_QUALITY)));

  return `${origin}/storage/v1/render/image/public/${path}?width=${width}&quality=${q}`;
}
