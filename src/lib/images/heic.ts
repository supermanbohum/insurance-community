/**
 * 아이폰 HEIC/HEIF 사진을 업로드 가능한 JPEG로 변환한다 (오너 최우선 지시 2026-08-18).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 * ─────────────────────────────────────────────────────────────────────────────
 * 아이폰 기본 카메라는 HEIC로 찍는다. 지점장 상당수가 아이폰인데, 모든 업로드 폼이
 * `IMAGE_TYPES = ['image/jpeg','image/png','image/webp']`로 막고 있어서 **찍은 사진을
 * 그대로 고르면 거부됐다.** 사진이 지점 페이지의 핵심 자산인데 입구에서 막히던 것.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 변환 전략 - 2단계 폴백 (CTO 지시의 사실관계 그대로)
 * ─────────────────────────────────────────────────────────────────────────────
 * ① **네이티브 디코드** (createImageBitmap → canvas → JPEG)
 *    iOS Safari는 HEIC를 네이티브로 디코드한다. 업로드 대부분이 폰에서 오므로
 *    주 경로는 **추가 다운로드 0바이트**로 동작한다.
 * ② **heic2any 폴백** (libheif WASM, ~1MB)
 *    데스크톱 크롬/엣지는 HEIC를 디코드하지 못한다. 그때만 dynamic import로 받는다 -
 *    HEIC를 고르지 않는 사용자는 이 코드를 내려받지 않는다.
 *
 * 변환 결과는 **최대 변 2048px · JPEG q0.85**로 리사이즈한다. 5712px 원본이 88px 칸에
 * 쓰이던 전례(2026-08-14 전송량 사고)가 있고, 변환은 용량이 커질 수 있어서다.
 * 뷰어도 화면 폭 기준(≤1920)으로 그리므로 2048이면 화질 손실이 보이지 않는다.
 *
 * 🔴 **조용히 실패하지 않는다.** 이 건의 원조 사고가 「10장 올렸는데 9장」(형식 불일치를
 * 말없이 continue)이었다. 변환 실패는 **어느 파일이 왜** 실패했는지 호출부가 화면에
 * 띄울 수 있게 {name, reason}으로 돌려준다.
 *
 * ⚠️ 클라이언트 전용이다(canvas·createImageBitmap·dynamic import). 서버 액션에서
 * 부르면 안 된다 - 서버 확장자 맵은 일부러 JPEG/PNG/WebP만 남겨 뒀다. 변환을 우회한
 * HEIC가 서버에 닿으면 명시적으로 거부되는 것이 조용한 저장 실패보다 낫다.
 */

/** HEIC 판정. 🔴 MIME type만 보면 안 된다 - Windows 크롬은 HEIC의 type을 빈 문자열로
 * 주는 경우가 있어서 확장자를 함께 본다. */
export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif' || type === 'image/heic-sequence' || type === 'image/heif-sequence') {
    return true;
  }
  return /\.hei[cf]$/i.test(file.name);
}

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

function renameToJpg(name: string): string {
  return name.replace(/\.hei[cf]$/i, '') + '.jpg';
}

async function bitmapToJpegFile(bitmap: ImageBitmap, originalName: string): Promise<File> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('JPEG_ENCODE_FAILED');
  return new File([blob], renameToJpg(originalName), { type: 'image/jpeg' });
}

/**
 * HEIC 파일 1개를 JPEG로 변환한다. HEIC가 아니면 그대로 돌려준다.
 * 실패 시 throw - 배치 처리는 normalizeImageFiles를 써라(파일별 실패 수집).
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  // ① 네이티브 디코드 (iOS Safari - 주 경로, 추가 다운로드 없음)
  try {
    const bitmap = await createImageBitmap(file);
    return await bitmapToJpegFile(bitmap, file.name);
  } catch {
    // 이 브라우저는 HEIC를 못 읽는다(데스크톱 크롬 등) - ②로 내려간다.
  }

  // ② heic2any (WASM) - HEIC를 고른 사용자만, 이 시점에만 로드된다.
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY });
  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;

  // heic2any 결과는 원본 해상도다 - 같은 리사이즈 규칙을 태운다.
  try {
    const bitmap = await createImageBitmap(jpegBlob);
    return await bitmapToJpegFile(bitmap, file.name);
  } catch {
    // 리사이즈만 실패한 경우다. 변환은 성공했으므로 원본 해상도 JPEG라도 돌려준다 -
    // 리사이즈 실패 때문에 업로드 전체를 막는 것은 배보다 배꼽이다.
    return new File([jpegBlob], renameToJpg(file.name), { type: 'image/jpeg' });
  }
}

export interface NormalizeResult {
  /** 업로드 가능한 파일들(HEIC는 JPEG로 변환됨, 그 외는 원본 그대로). 입력 순서 유지. */
  ok: File[];
  /** 변환에 실패한 파일들. 🔴 호출부는 이것을 반드시 화면에 띄운다 - 조용히 버리지 않는다. */
  failed: { name: string; reason: string }[];
}

/** 파일 목록에서 HEIC만 JPEG로 변환하고, 실패를 파일별로 수집한다. */
export async function normalizeImageFiles(files: File[]): Promise<NormalizeResult> {
  const ok: File[] = [];
  const failed: { name: string; reason: string }[] = [];
  for (const file of files) {
    if (!isHeicFile(file)) {
      ok.push(file);
      continue;
    }
    try {
      ok.push(await convertHeicToJpeg(file));
    } catch (err) {
      console.error('[heic] 변환 실패', file.name, err);
      failed.push({ name: file.name, reason: '아이폰 사진(HEIC) 변환에 실패했습니다. 다시 시도하거나 다른 사진을 선택해주세요.' });
    }
  }
  return { ok, failed };
}

/** 폼의 IMAGE_TYPES/DOC_TYPES 배열에 이어 붙일 HEIC MIME 목록. */
export const HEIC_TYPES = ['image/heic', 'image/heif'];

/** input accept에 이어 붙일 확장자. 🔴 MIME만으로는 부족하다 - 일부 환경은 HEIC의
 * MIME을 모르므로 확장자가 없으면 파일 선택창에서 아예 회색 처리된다. */
export const HEIC_ACCEPT = '.heic,.heif';
