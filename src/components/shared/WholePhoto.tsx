import { cn } from '@/lib/utils';
import { SafeBranchImage } from '@/components/shared/SafeBranchImage';

/**
 * 사진을 **잘라내지 않고 전체가 보이게** 그린다 (오너 지시 2026-09-04:
 * 「홈페이지에 나오는 화면들 전부 사진조정해서 전체사진 잘 나오도록 해」).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요했나
 * ─────────────────────────────────────────────────────────────────────────────
 * 카드와 상세 상단이 전부 `aspect-[4/3]` 고정 틀 + `object-cover` 였다.
 * cover 는 틀을 꽉 채우려고 **넘치는 부분을 잘라낸다.** 지점 사진은 비율이 제각각이라
 * 잘리는 양이 크다 - 실측(2026-09-04): 더블유에셋 HC본부 사무실 사진은 **384x4000**
 * (세로 10배)이고, 대표사진은 회사 로고 이미지라 4:3 틀에서 「HC본부」 글자가 잘려 나갔다.
 * 세로로 긴 사진일수록 **가운데 한 줄만** 보인다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 어떻게 푸는가 - contain + 같은 사진의 흐린 배경
 * ─────────────────────────────────────────────────────────────────────────────
 * `object-contain` 하나만 쓰면 사진 전체는 보이지만 **양옆(또는 위아래)에 빈 회색 띠**가
 * 남아 카드가 비어 보인다. 그래서 뒤에 **같은 사진을 흐리게 확대해 깔아** 그 자리를 채운다
 * (인스타·유튜브가 세로 영상에 쓰는 방식).
 *
 * 🔴 배경과 본체는 **src 와 sizes 가 같다.** 같은 URL 이므로 브라우저가 한 번만 받고
 *    두 번 그린다 - **네트워크 요청이 늘지 않는다.** (다르게 주면 변환·전송이 2배가 된다.)
 *
 * ⚠️ 아주 작은 썸네일(지도 목록의 56px 등)에는 쓰지 않는다. 그 크기에서 contain 은
 *    사진이 더 작아져 무엇인지 알아볼 수 없고, 흐린 배경도 뭉개져 지저분해진다.
 *    그 자리는 「사진을 보는 곳」이 아니라 「어느 지점인지 구분하는 표시」다.
 */
export function WholePhoto({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  /** 배경과 본체가 **같은 값**을 쓴다(위 주석 참고). */
  sizes: string;
  priority?: boolean;
  /** 본체에만 붙는다. 호버 확대 같은 카드별 효과를 넘길 때 쓴다. */
  className?: string;
}) {
  return (
    <>
      {/* 배경: 빈 여백을 같은 사진의 흐린 확대본으로 채운다.
          scale-125 는 blur 가 가장자리를 투명하게 번지게 하는 것을 가린다. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 block overflow-hidden">
        <SafeBranchImage src={src} alt="" sizes={sizes} className="scale-125 object-cover opacity-45 blur-2xl" />
      </span>

      {/* 본체: 잘리지 않는다 */}
      <SafeBranchImage src={src} alt={alt} sizes={sizes} priority={priority} className={cn('object-contain', className)} />
    </>
  );
}
